// src/pages/AdminLogin.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const [csrf, setCsrf] = useState("");
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/csrf", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCsrf(d?.csrf || ""))
      .catch(() => setMsg("Unable to initialize login"));
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, csrf })
      });
      if (r.ok) {
        const ret = new URLSearchParams(loc.search).get("ret") || "/admin";
        window.location.assign(ret);
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (d.error === "locked") setMsg("Too many attempts. Try again later.");
      else if (d.error === "csrf") setMsg("Security check failed. Reload the page.");
      else setMsg("Invalid credentials.");
    } catch {
      setMsg("Network error. Try again.");
    }
  }

  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#0b0d12"}}>
      <form onSubmit={onSubmit} style={{width:380,maxWidth:"90%",background:"#121520",padding:26,borderRadius:16,border:"1px solid #1e2230",boxShadow:"0 10px 30px rgba(0,0,0,.35)"}}>
        <h1 style={{margin:0,fontSize:20,color:"#e5e7eb"}}>Sign in to Admin</h1>
        <p style={{margin:"6px 0 18px",fontSize:13,color:"#98a2b3"}}>Access is restricted. All attempts are logged.</p>
        <label style={{display:"block",fontSize:13,color:"#cbd5e1",margin:"12px 0 6px"}}>Email</label>
        <input value={username} onChange={e=>setUser(e.target.value)} required type="email" placeholder="you@example.com"
               style={{width:"100%",padding:12,borderRadius:10,border:"1px solid #2a3042",background:"#0f121a",color:"#e5e7eb"}}/>
        <label style={{display:"block",fontSize:13,color:"#cbd5e1",margin:"12px 0 6px"}}>Password</label>
        <input value={password} onChange={e=>setPass(e.target.value)} required type="password" placeholder="••••••••"
               style={{width:"100%",padding:12,borderRadius:10,border:"1px solid #2a3042",background:"#0f121a",color:"#e5e7eb"}}/>
        <button type="submit" style={{width:"100%",marginTop:16,padding:"12px 14px",background:"#6ee7b7",color:"#0b0d12",border:"none",borderRadius:10,fontWeight:600,cursor:"pointer"}}>Sign in</button>
        {msg && <div style={{marginTop:8,color:"#fda4af",fontSize:12}}>{msg}</div>}
        <div style={{marginTop:16,textAlign:"center",color:"#98a2b3",fontSize:12}}>Protected area · Solo Wardrobe</div>
      </form>
    </div>
  );
}
