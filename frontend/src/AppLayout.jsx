
import React,{useEffect,useState} from "react";
import {NavLink,Outlet} from "react-router-dom";
import useApiStatus from "./hooks/useApiStatus";
import { setAuthKeyUtil } from "./util";

export default function AppLayout(){
  const status=useApiStatus();
  const [dark,setDark]=useState(()=>localStorage.getItem("dark")==="true");
  const [authKey, setAuthKey] = useState(() => localStorage.getItem("authKey") || "");

  useEffect(() => {
    if (authKey) {
      localStorage.setItem("authKey", authKey);
    } else {
      localStorage.removeItem("authKey");
    }
  }, [authKey]);

  useEffect(()=>{
    document.documentElement.classList.toggle("dark",dark);
    localStorage.setItem("dark",dark);
  },[dark]);
  return(<div className="flex flex-col min-h-screen transition-colors">
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Tracker</h1>
        <nav className="flex gap-6 text-lg">
          <NavLink to="/" className={({isActive})=>isActive?"underline font-semibold":"hover:underline"}>Applied</NavLink>
          <NavLink to="/schedules" className={({isActive})=>isActive?"underline font-semibold":"hover:underline"}>Schedules</NavLink>
        </nav>
        <button onClick={()=>setDark(!dark)} className="ml-4 text-xl hover:scale-110 transition-transform">{dark?"☀️":"🌙"}</button>
        <input
          type="password"
          placeholder="AuthKey"
          className="ml-4 px-2 py-1 rounded text-gray-800"
          value={authKey}
          onChange={(e) => {
            setAuthKey(e.target.value)
            setAuthKeyUtil(e.target.value)
          }}
        />
      </div>
    </header>
    <main className="flex-1 w-full px-8 py-8"><Outlet/></main>
    <footer className="bg-gray-200 dark:bg-gray-800 text-sm py-3">
      <div className="max-w-6xl mx-auto flex justify-between items-center px-6">
        <span>© {new Date().getFullYear()} Job Tracker</span>
        <span>API Status: {status==="online"?<span className="text-green-600 font-semibold">🟢 Online</span>:status==="checking"?<span className="text-yellow-500">🟡 Checking...</span>:<span className="text-red-600 font-semibold">🔴 Offline</span>}</span>
      </div>
    </footer>
  </div>);
}
