# PocketPay

A mobile-friendly Ethereum dapp for sending test ETH on Sepolia.

Connect an injected Ethereum wallet, check its Sepolia balance, send a transfer, and follow the transaction on Etherscan. PocketPay supports opening inside MetaMask on a phone and adding the app to a home screen.

PocketPay only sends on Sepolia. Test ETH has no real-world value. The app never asks for a recovery phrase or private key.

## Run locally

Serve this folder from localhost, then open it in a wallet-enabled browser.

## Deploy

The repository includes a Render Blueprint in `render.yaml`. Select the GitHub repository in Render and create the Blueprint. The static site has no build step.
