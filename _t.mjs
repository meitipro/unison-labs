const RPC='https://studio.genlayer.com/api';
const rpc=async(m,p=[])=>(await (await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:m,params:p})})).json());
for (const [tag,H] of [["yours (8802)","0x6cb4c3a9218648b5e04182191942299ee4ba5ce6e640c4c88852e152a55165d6"],
                        ["mine (8801, the decoy)","0xb5ebd69e6225c874d90f09d4b6919fd08e0c60dcc01009e171456aedc8d74902"]]) {
  const d=(await rpc('eth_getTransactionByHash',[H])).result;
  const lr=d?.consensus_data?.leader_receipt; const one=Array.isArray(lr)?lr[0]:lr;
  const v=d?.consensus_data?.votes||{};
  console.log("%-24s from %s  %s  %s  votes %s", tag, (d?.from_address||"?").slice(0,10)+"...", d?.status, one?.execution_result,
    JSON.stringify(Object.values(v).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})));
}
