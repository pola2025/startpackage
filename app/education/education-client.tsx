"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./education.module.css";

export default function EducationClient() {
  const [mode,setMode]=useState<"student"|"admin">("student");
  const [value,setValue]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{if(new URLSearchParams(location.search).get("expired")==="1")setError("열람 세션이 종료되었습니다. 다시 입장해주세요.")},[]);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");try{const endpoint=mode==="student"?"/api/education/login":"/api/education/admin-login";const payload=mode==="student"?{phone:value}:{password:value};const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok){setError(data.error||"접속할 수 없습니다.");return}location.href=data.course}catch{setError("네트워크 연결을 확인해주세요.")}finally{setBusy(false)}}
  return <main className={styles.page}>
    <section className={styles.desktop}>
      <div className={styles.brand}><small>비즈액터스쿨 · 폴라애드</small><h1>온라인마케팅<br/><em>교육자료실</em></h1><div className={styles.points}><span>Meta 본교육 01–07</span><span>콘텐츠 별도교육 08</span><span>업무지원 09–11</span></div></div>
      <div className={styles.panel}><div className={styles.tabs}><button type="button" className={mode==="student"?styles.active:""} onClick={()=>{setMode("student");setValue("");setError("")}}>수강생</button><button type="button" className={mode==="admin"?styles.active:""} onClick={()=>{setMode("admin");setValue("");setError("")}}>관리자</button></div><h2>{mode==="student"?"전화번호로 입장":"관리자 열람"}</h2><p>{mode==="student"?"등록된 본인 전화번호를 입력하세요. 교육 시작일부터 8주 동안 열립니다.":"교육 포털 관리자 비밀번호를 입력하세요."}</p><form className={styles.form} onSubmit={submit}><label htmlFor="credential">{mode==="student"?"본인 전화번호":"관리자 비밀번호"}</label><input id="credential" inputMode={mode==="student"?"tel":undefined} type={mode==="student"?"tel":"password"} autoComplete="off" placeholder={mode==="student"?"010 1234 5678":"비밀번호 입력"} value={value} onChange={e=>setValue(e.target.value)} maxLength={mode==="student"?13:256}/><button disabled={busy}>{busy?"확인 중":"교육자료 열기"}</button><p className={styles.error} role="alert">{error}</p></form><Link className={styles.extend} href="/education/extension">교육자료 열람 연장신청</Link><p className={styles.privacy}>접속 보안을 위해 로그인 시각, 접속 환경과 IP가 기록됩니다.</p></div>
    </section>
    <section className={styles.mobile}><div className={styles.pcIcon}/><h1>PC 또는 노트북에서<br/>열어주세요.</h1><p>이 교육자료는 강의용 큰 화면과 실제 PC 설정 화면에 맞춰 제작되었습니다.</p></section>
  </main>
}
