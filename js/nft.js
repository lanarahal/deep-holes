/**
 * Lists the NFTs owned by a wallet (Solana DAS `getAssetsByOwner`).
 * Returns { demo: boolean, items: [{ id, name, image }] }
 */
import { DAS_RPC_URL } from "./config.js?v=4";

const ipfs = (u) => (u || "").replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/");

export async function fetchWalletNFTs(owner) {
  if (!DAS_RPC_URL) {
    return {
      demo: true,
      items: Array.from({ length: 8 }, (_, i) => ({
        id: "demo" + i, name: `Demo NFT #${i + 1}`,
        image: `https://picsum.photos/seed/dh-nft${i}/480/480`
      }))
    };
  }
  const res = await fetch(DAS_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: "deep-holes", method: "getAssetsByOwner",
      params: { ownerAddress: owner, page: 1, limit: 100, displayOptions: { showFungible: false } }
    })
  });
  if (!res.ok) throw new Error("RPC error " + res.status);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "RPC error");
  const items = (json.result?.items || []).map((a) => {
    const file = a.content?.files?.find((f) => (f.mime || "").startsWith("image/"));
    const image = ipfs(a.content?.links?.image || file?.cdn_uri || file?.uri);
    return { id: a.id, name: a.content?.metadata?.name || "NFT", image };
  }).filter((n) => n.image);
  return { demo: false, items };
}
