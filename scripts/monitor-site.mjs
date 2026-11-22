import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function checkSite({url,token,chatIds,previousStatus="unknown",fetchImpl=fetch}) {
  let status="down";
  let httpStatus=0;
  try {
    const response=await fetchImpl(url,{cache:"no-store",signal:AbortSignal.timeout(15_000)});
    httpStatus=response.status;
    const body=await response.json();
    if(response.ok && body.status==="ok" && body.storage==="available") status="up";
  } catch { /* A timeout or malformed health response is an outage. */ }
  const changed=(status==="down"&&previousStatus!=="down")||(status==="up"&&previousStatus==="down");
  if(changed) {
    if(!token || chatIds.length===0) throw new Error("Telegram monitoring secrets are not configured");
    const message=status==="down"
      ? "🚨 Blitz Career: сайт или база недоступны.\nПроверка: "+url+"\nHTTP: "+httpStatus
      : "✅ Blitz Career: работа сайта и базы восстановлена.\n"+url;
    await sendTelegramAlert({token,chatIds,message,fetchImpl});
  }
  return {status,httpStatus,checkedAt:new Date().toISOString(),notificationSent:changed};
}

async function sendTelegramAlert({token,chatIds,message,fetchImpl=fetch}) {
  const deliveries=await Promise.all(chatIds.map(async chatId=>{
    try {
      const response=await fetchImpl("https://api.telegram.org/bot"+token+"/sendMessage",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text:message}),signal:AbortSignal.timeout(10_000),
      });
      const body=await response.json();
      return response.ok && body.ok===true;
    } catch { return false; }
  }));
  if(!deliveries.every(Boolean)) throw new Error("Telegram alert delivery failed; will retry next check");
}

async function main() {
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatIds=[...new Set((process.env.TELEGRAM_CHAT_IDS||"").split(/[,\s]+/).filter(id=>/^-?\d+$/.test(id)))];
  if(!token || chatIds.length!==2) throw new Error("Configure TELEGRAM_BOT_TOKEN and two TELEGRAM_CHAT_IDS in GitHub Actions secrets");
  if(process.env.MONITOR_TEST_NOTIFICATION === "true") await sendTelegramAlert({token,chatIds,message:"🔔 Blitz Career — тест независимого мониторинга. Проверка Telegram из GitHub Actions; это не сообщение о реальном сбое."});
  const stateFile=process.env.MONITOR_STATE_FILE||".monitor-state.json";
  let previousStatus="unknown";
  try {
    const saved=JSON.parse(await readFile(stateFile,"utf8"));
    if(["up","down"].includes(saved.status)) previousStatus=saved.status;
  } catch { /* First run. */ }
  const result=await checkSite({url:process.env.MONITOR_URL||"https://blitz-career.vercel.app/api/health",token,chatIds,previousStatus});
  await writeFile(stateFile,JSON.stringify(result,null,2)+"\n");
  console.log(JSON.stringify(result));
}
if(typeof process !== "undefined" && process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
