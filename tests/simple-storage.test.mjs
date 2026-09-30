import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../simple-storage/index.html", import.meta.url), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const address = "0xab32bd19c1a369b9a949aa7ff2bd0ef5a2518b76";
const account = "0x0000000000000000000000000000000000000001";

async function app({ chain = "0xaa36a7", source = script } = {}) {
  const elements = new Map();
  const sends = [];
  let stored = 44n;
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: "", value: "", hidden: false, disabled: false, classList: { toggle() {} }, addEventListener() {} });
    return elements.get(id);
  };
  const read = request => {
    assert.equal(request.to, address, "RPC must target the original 20-byte contract");
    assert.match(request.to, /^0x[0-9a-f]{40}$/);
    assert.equal(request.data, "0x6d4ce63c", "Original ABI uses get()");
    return "0x" + stored.toString(16).padStart(64, "0");
  };
  const provider = {
    on() {},
    async request({ method, params }) {
      if (method === "eth_accounts") return [];
      if (method === "eth_requestAccounts") return [account];
      if (method === "eth_chainId") return chain;
      if (method === "eth_call") return read(params[0]);
      if (method === "eth_sendTransaction") {
        assert.equal(params[0].to, address);
        assert.equal(params[0].from, account);
        assert.match(params[0].data, /^0x60fe47b1[0-9a-f]{64}$/, "Original ABI uses set(uint256)");
        sends.push(params[0]);
        stored = BigInt("0x" + params[0].data.slice(10));
        return "0x" + "ab".repeat(32);
      }
      if (method === "eth_getTransactionReceipt") return { status: "0x1" };
      throw Error("Unexpected RPC method: " + method);
    }
  };
  const context = vm.createContext({
    document: { getElementById: element },
    window: { ethereum: provider, addEventListener() {} },
    navigator: { userAgent: "", platform: "", maxTouchPoints: 0 },
    location: { host: "example.test", pathname: "/", protocol: "https:" },
    setTimeout: resolve => resolve(),
    fetch: async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.equal(request.method, "eth_call");
      const result = read(request.params[0]);
      return { ok: true, json: async () => ({ result }) };
    }
  });
  vm.runInContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { context, element, sends };
}

test("public and wallet reads use the reference contract ABI", async () => {
  const { context, element } = await app();
  assert.equal(element("storedValue").textContent, "44");
  await context.connect();
  assert.equal(element("storedValue").textContent, "44");
  assert.equal(element("storeButton").disabled, false);
});

test("storing a number sends set(uint256) and refreshes the receipt result", async () => {
  const { context, element, sends } = await app();
  await context.connect();
  element("numberInput").value = "1";
  await context.storeNumber({ preventDefault() {} });
  assert.equal(sends.length, 1);
  assert.equal(sends[0].data, "0x60fe47b1" + "1".padStart(64, "0"));
  assert.equal(element("storedValue").textContent, "1");
  assert.equal(element("numberInput").value, "");
});

test("invalid integers never request a transaction; uint256 maximum is exact", async () => {
  const { context, element, sends } = await app();
  await context.connect();
  for (const input of ["-1", "1.5", "", (1n << 256n).toString()]) {
    element("numberInput").value = input;
    await context.storeNumber({ preventDefault() {} });
  }
  assert.equal(sends.length, 0);
  element("numberInput").value = ((1n << 256n) - 1n).toString();
  await context.storeNumber({ preventDefault() {} });
  assert.equal(sends[0].data, "0x60fe47b1" + "f".repeat(64));
});

test("wrong network and malformed contract cannot send transactions", async () => {
  const wrongNetwork = await app({ chain: "0x1" });
  await wrongNetwork.context.connect();
  wrongNetwork.element("numberInput").value = "1";
  await wrongNetwork.context.storeNumber({ preventDefault() {} });
  assert.equal(wrongNetwork.sends.length, 0);
  assert.equal(wrongNetwork.element("storeButton").disabled, true);
  const malformed = await app({ source: script.replace(address, address.slice(0, -1)) });
  await malformed.context.connect();
  malformed.element("numberInput").value = "1";
  await malformed.context.storeNumber({ preventDefault() {} });
  assert.equal(malformed.sends.length, 0);
  assert.match(malformed.element("status").textContent, /contract address is invalid/);
});
