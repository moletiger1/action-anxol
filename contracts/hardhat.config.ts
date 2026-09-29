import { defineConfig } from "hardhat/config";

// デモ専用。ローカルの Hardhat ネットワークのみを設定している。
// 実資金を扱うチェーン・資産は未決定のため、公開ネットワークの設定は置かない。
export default defineConfig({
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },
});
