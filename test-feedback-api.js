// 간단한 API 테스트 스크립트
console.log("이 스크립트는 실제 세션이 필요하므로 브라우저 콘솔에서 실행해야 합니다:");
console.log("");
console.log("// 브라우저 콘솔에서 실행:");
console.log("fetch('/api/workflows/YOUR_WORKFLOW_ID/feedback', {");
console.log("  method: 'POST',");
console.log("  headers: { 'Content-Type': 'application/json' },");
console.log("  body: JSON.stringify({ feedback: '테스트 피드백입니다' })");
console.log("}).then(r => r.json()).then(console.log).catch(console.error);");
