import assert from "node:assert/strict";
import test from "node:test";
import {runInNewContext} from "node:vm";
import {extensionCreateCode} from "../src/extension-create-script.ts";
const origin="___GO_EXTENSION_CREATE_ORIGIN___";
function frame(){
 const messages:{data:{source:string,type:string,targetUrl?:unknown,turnstileToken?:unknown,message?:string},origin:string}[]=[],parent={postMessage(data:{source:string,type:string,targetUrl?:unknown,turnstileToken?:unknown,message?:string},origin:string){messages.push({data,origin});}};
 let receive:((event:{origin:string,source:unknown,data:unknown})=>void)|undefined;
 const window:{goExtensionTurnstile?:(token:unknown)=>void,goExtensionTurnstileError?:()=>void,addEventListener:(type:string,fn:(event:{origin:string,source:unknown,data:unknown})=>void)=>void}={addEventListener(type,fn){assert.equal(type,"message");receive=fn;}};
 runInNewContext(extensionCreateCode,{window,parent});return{messages,parent,window,send(data:unknown,eventOrigin=origin,source:unknown=parent){assert(receive);receive({origin:eventOrigin,source,data});}};
}
test("初期readyは固定originへ一度通知する",()=>{const f=frame();assert.equal(f.messages.length,1);assert.equal(f.messages[0].data.source,"go-extension-create");assert.equal(f.messages[0].data.type,"ready");assert.equal(f.messages[0].origin,origin);});
test("origin・親window・popup sourceが不一致ならtargetを受け取らない",()=>{for(const [o,parentMatch,data]of [["wrong",true,{source:"go-extension-popup",targetUrl:"https://x"}],[origin,false,{source:"go-extension-popup",targetUrl:"https://x"}],[origin,true,{source:"other",targetUrl:"https://x"}]] as const){const f=frame();f.send(data,o,parentMatch?f.parent:{});f.window.goExtensionTurnstile?.("token");assert.equal(f.messages.length,1);}});
test("popupのtargetとstring tokenを固定originへ返す",()=>{const f=frame();f.send({source:"go-extension-popup",targetUrl:"https://example.com"});f.window.goExtensionTurnstile?.("token");assert.equal(f.messages[1].data.type,"token");assert.equal(f.messages[1].data.targetUrl,"https://example.com");assert.equal(f.messages[1].data.turnstileToken,"token");assert.equal(f.messages[1].origin,origin);});
test("空targetとTurnstile失敗はerrorを通知する",()=>{const f=frame();f.send({source:"go-extension-popup",targetUrl:42});f.window.goExtensionTurnstileError?.();assert.equal(f.messages.length,3);assert.equal(f.messages[1].data.type,"error");assert.equal(f.messages[2].data.type,"error");});
test("非string tokenは通知せず空string tokenは旧動作で通知する",()=>{const f=frame();f.send({source:"go-extension-popup",targetUrl:"https://x"});for(const token of [null,undefined,0,false,{}])f.window.goExtensionTurnstile?.(token);assert.equal(f.messages.length,1);f.window.goExtensionTurnstile?.("");assert.equal(f.messages[1].data.turnstileToken,"");});
test("target getterを再取得し第二値を既存のまま使う",()=>{const f=frame();let reads=0;f.send({source:"go-extension-popup",get targetUrl(){return ++reads===1?"first":"second";}});f.window.goExtensionTurnstile?.("token");assert.equal(reads,2);assert.equal(f.messages[1].data.targetUrl,"second");});
