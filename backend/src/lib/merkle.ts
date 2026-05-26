import { MerkleTree } from "merkletreejs";
import SHA256 from "crypto-js/sha256.js";

export interface IotEvent {
  id: string;
  data: Record<string, unknown>;
  recorded_at: string;
}

export function buildDailyMerkleTree(events: IotEvent[]) {
  const leaves = events.map((e) => SHA256(JSON.stringify(e)).toString());
  const tree = new MerkleTree(leaves, SHA256);
  const root = tree.getHexRoot();

  const proofs = events.map((_, i) => ({
    index: i,
    proof: tree.getHexProof(leaves[i]),
  }));

  return { root, leaves, proofs, tree };
}

export function verifyProof(
  leaf: string,
  proof: string[],
  root: string
): boolean {
  const tree = new MerkleTree([], SHA256);
  return tree.verify(proof, leaf, root);
}
