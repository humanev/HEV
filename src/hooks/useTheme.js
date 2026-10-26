import React, {useContext, useState} from "react";
export const ThemeContext=React.createContext({dark:false,toggle:()=>{}});
export function useTheme(){return useContext(ThemeContext);}
export function useThemeState(){
  const [dark,setDark]=useState(()=>localStorage.getItem("hev-theme")==="dark");
  const toggle=()=>setDark(value=>{const next=!value;localStorage.setItem("hev-theme",next?"dark":"light");return next});
  return [dark,toggle];
}
