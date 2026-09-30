import React, {useEffect,useState} from 'react';
export function FileCard({children}:{children:React.ReactNode}){return <div className="standalone-card">{children}</div>}
export function Header({title,fact}:{title:string,fact:string}){return <header className="standalone-header"><h1>{title}</h1><p>{fact}</p></header>}
export function Closing({children}:{children?:React.ReactNode}){return <footer>{children}</footer>}
export function useLocalState<T>(key:string,initial:T):[T,React.Dispatch<React.SetStateAction<T>>,{ready:boolean,message:string}]{const [value,setValue]=useState<T>(()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):initial}catch{return initial}});useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}},[key,value]);return [value,setValue,{ready:true,message:'Saved on this browser.'}]}
