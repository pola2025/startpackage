import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { educationRequestMeta, isAutomatedAgent } from "@/lib/education/request-meta";
import { readEducationSession } from "@/lib/education/session";
import { recordEducationDocument, recordEducationSecurityHit } from "@/lib/education/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = path.resolve(process.cwd(), "private", "education-course");
const ALLOWED = new Set([".html", ".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".woff", ".woff2", ".mp4", ".webm"]);
const TYPES: Record<string,string> = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".svg":"image/svg+xml", ".woff":"font/woff", ".woff2":"font/woff2", ".mp4":"video/mp4", ".webm":"video/webm" };

function headers(type:string){return {"Content-Type":type,"Cache-Control":"private, no-store, max-age=0","X-Robots-Tag":"noindex, nofollow, noarchive, nosnippet, noimageindex","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","X-Frame-Options":"SAMEORIGIN","Content-Security-Policy":"default-src 'self'; img-src 'self' data: https:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"};}

export async function GET(request:Request,{params}:{params:Promise<{path:string[]}>}){
  let meta;
  try{meta=educationRequestMeta(request)}catch{return NextResponse.json({error:"Access unavailable"},{status:503})}
  if(process.env.NODE_ENV==="production"&&isAutomatedAgent(meta.userAgent)){await recordEducationSecurityHit(meta,"automated-course-access");return new NextResponse("Forbidden",{status:403,headers:headers("text/plain; charset=utf-8")})}
  const session=await readEducationSession(meta.ipHash);
  if(!session)return NextResponse.redirect(new URL("/education?expired=1",request.url),303);
  const parts=(await params).path;
  if(!Array.isArray(parts)||!parts.length||parts.some(part=>!part||part==="."||part===".."||part.includes("\\")||part.includes("\0")))return new NextResponse("Not found",{status:404});
  const filePath=path.resolve(ROOT,...parts);
  if(filePath!==ROOT&&!filePath.startsWith(ROOT+path.sep))return new NextResponse("Not found",{status:404});
  const ext=path.extname(filePath).toLowerCase();
  if(!ALLOWED.has(ext))return new NextResponse("Not found",{status:404});
  let info;
  try{info=await stat(filePath);if(!info.isFile())throw new Error()}catch{return new NextResponse("Not found",{status:404})}
  if(ext===".html"){
    try{await recordEducationDocument(meta,session)}catch{return new NextResponse("Access temporarily unavailable",{status:429,headers:headers("text/plain; charset=utf-8")})}
  }
  const range=request.headers.get("range");
  if(range&&(ext===".mp4"||ext===".webm")){
    const match=/^bytes=(\d+)-(\d*)$/.exec(range);
    if(!match)return new NextResponse(null,{status:416,headers:{"Content-Range":`bytes */${info.size}`}});
    const start=Number(match[1]);const end=match[2]?Math.min(Number(match[2]),info.size-1):Math.min(start+1024*1024-1,info.size-1);
    if(start>end||start>=info.size)return new NextResponse(null,{status:416,headers:{"Content-Range":`bytes */${info.size}`}});
    const full=await readFile(filePath);const body=full.subarray(start,end+1);
    return new NextResponse(body,{status:206,headers:{...headers(TYPES[ext]),"Accept-Ranges":"bytes","Content-Range":`bytes ${start}-${end}/${info.size}`,"Content-Length":String(body.length)}});
  }
  const buffer=await readFile(filePath);
  if(ext!==".html")return new NextResponse(buffer,{headers:{...headers(TYPES[ext]),"Content-Length":String(buffer.length)}});
  let html=buffer.toString("utf8");
  const guard=`<script>(()=>{const expiresAt=${session.expiresAt};const close=()=>{if(Date.now()>=expiresAt)top.location.replace('/education?expired=1')};setTimeout(close,Math.max(0,expiresAt-Date.now())+250);document.addEventListener('visibilitychange',()=>{if(!document.hidden)close()});})();</script>`;
  html=html.includes("</body>")?html.replace("</body>",`${guard}</body>`):html+guard;
  return new NextResponse(html,{headers:headers(TYPES[ext])});
}
