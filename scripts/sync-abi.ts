import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractArtifactPath = path.join(
  root,
  "contracts",
  "target",
  "dev",
  "dare_board_DareBoard.contract_class.json"
);
const outputPath = path.join(root, "src", "lib", "abi.json");

function main() {
  if (!fs.existsSync(contractArtifactPath)) {
    throw new Error(
      `Contract artifact not found at ${contractArtifactPath}. Run \`npm run contract:build\` first.`
    );
  }

  const artifact = JSON.parse(fs.readFileSync(contractArtifactPath, "utf8")) as {
    abi?: unknown;
  };

  if (!artifact.abi) {
    throw new Error("Contract artifact did not contain an ABI.");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2));
  console.log(`ABI written to ${outputPath}`);
}

main();
