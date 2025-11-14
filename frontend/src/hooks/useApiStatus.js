
import { useEffect, useState } from "react";
import { BACKEND, apiFetch } from "../util";
export default function useApiStatus(intervalMs=10000){
  const [status,setStatus]=useState("checking");
  useEffect(()=>{
    let active=true;
    async function check(){
      try{
        const res=await apiFetch(`${BACKEND}/`);
        if(res.ok&&active)setStatus("online");else if(active)setStatus("offline");
      }catch{if(active)setStatus("offline");}
    }
    check();
    const id=setInterval(check,intervalMs);
    return()=>{active=false;clearInterval(id)};
  },[intervalMs]);
  return status;
}
