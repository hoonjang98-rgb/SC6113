# SimpleStorage

A mobile-friendly Ethereum dapp that reads and stores one unsigned integer on Sepolia.

Connect MetaMask, view the current on-chain value, refresh it, and submit a new value with a wallet-confirmed transaction. The app checks the network before writing and includes a responsive layout and installable PWA shell.

The app uses contract `0xab32bd19c1a369b9a94aa7ff2bd0ef5a2518b76` on Sepolia (chain ID `11155111`). The root `render.yaml` deploys the static site from `simple-storage`.
