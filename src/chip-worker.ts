// Worker runs vendored LGPL-2.1 emulator modules locally. No external code is fetched.
// @ts-ignore upstream Emscripten output is JavaScript
import asmGME from './vendor/chip/gme-asm.js';
type Command={id:number;format:'nsf'|'gbs'|'ay'|'vgm';bytes:ArrayBuffer;track:number};
export async function decodeChip(format:Command['format'],bytes:ArrayBuffer,track:number){
 const module:any=asmGME;const data=new Uint8Array(bytes);
 if(format==='vgm'){
  if(data.length<0x40||String.fromCharCode(...data.subarray(0,4))!=='Vgm ')throw Error('Not a VGM file.');
  const header=new DataView(bytes);
  const headerEnd=Math.min(data.length,Math.max(0x40,0x34+(header.getUint32(0x34,true)||0x0c)));
  const supported=[0x0c,0x10,0x2c].some(offset=>header.getUint32(offset,true)&0x3fffffff);
  const unsupported=[0x30,0x38,0x40,0x44,0x48,0x4c,0x50,0x54,0x58,0x5c,0x60,0x64,0x68,0x6c,0x70,0x74,0x78].some(offset=>offset+4<=headerEnd&&(header.getUint32(offset,true)&0x3fffffff));
  if(!supported||unsupported)throw Error('This VGM uses a sound chip this browser player cannot decode. Sega PSG VGMs play here; this file uses another or mixed chip and needs a different player.');
 }
const ref=module._malloc(4);const ptr=module._malloc(data.length);module.HEAPU8.set(data,ptr);const sampleRate=44100;const err=module._gme_open_data(ptr,data.length,ref,sampleRate);module._free(ptr);if(err)throw Error('Game Music Emu rejected this '+format.toUpperCase()+' file.');const emu=module.getValue(ref,'i32');module._free(ref);if(!emu)throw Error('Game Music Emu returned no player.');try{const count=module._gme_track_count(emu);if(track>=count)throw Error('Track not found (this file has '+count+' tracks).');module._gme_ignore_silence(emu,1);if(module._gme_start_track(emu,track))throw Error('Could not start track.');const voiceCount=Math.min(8,module._gme_voice_count(emu));const voiceNames=Array.from({length:voiceCount},(_,i)=>{const ptr=module._gme_voice_name(emu,i);let end=ptr;while(module.HEAPU8[end]&&end-ptr<64)end++;return new TextDecoder().decode(module.HEAPU8.subarray(ptr,end))});const declaredMs=format==='vgm'?Math.round((new DataView(bytes)).getUint32(0x18,true)/44.1):0;const lengthMs=Math.min(180000,Math.max(1000,declaredMs||180000)),samples=Math.ceil(sampleRate*lengthMs/1000),chunk=8192;const pcm=new Int16Array(samples*2);const out=module._malloc(chunk*2*2);if(!out)throw Error('Out of decoder memory.');const envelopeStep=512;const envelopeCount=Math.ceil(Math.ceil(11025*lengthMs/1000)/envelopeStep);const voiceLevels=Array.from({length:voiceCount},()=>new Uint8Array(envelopeCount));try{for(let pos=0;pos<samples;pos+=chunk){const n=Math.min(chunk,samples-pos);if(module._gme_play(emu,n*2,out))throw Error('Could not render audio.');pcm.set(module.HEAP16.subarray(out/2,out/2+n*2),pos*2);if((pos/chunk)%8===7)await new Promise<void>(resolve=>setTimeout(resolve,0))}
 // A low-rate second emulator supplies channel envelopes without changing 44.1 kHz playback.
 const meterRate=11025,meterSamples=Math.ceil(meterRate*lengthMs/1000),meterStep=512;
 const meterRef=module._malloc(4),meterData=module._malloc(data.length);
 if(!meterRef||!meterData)throw Error('Out of decoder memory for channel meters.');
 try{
  module.HEAPU8.set(data,meterData);
  if(module._gme_open_data(meterData,data.length,meterRef,meterRate))throw Error('Could not start channel meter decoder.');
  const meterEmu=module.getValue(meterRef,'i32');
  if(!meterEmu)throw Error('Channel meter decoder returned no player.');
  try{
   module._gme_ignore_silence(meterEmu,1);
   for(let voice=0;voice<voiceCount;voice++){
    if(module._gme_start_track(meterEmu,track))throw Error('Could not isolate chip channel '+(voice+1));
    module._gme_mute_voices(meterEmu,((1<<voiceCount)-1)^(1<<voice));
    let carry=0,sum=0,slot=0;
    for(let pos=0;pos<meterSamples;pos+=chunk){const n=Math.min(chunk,meterSamples-pos);
     if(module._gme_play(meterEmu,n*2,out))throw Error('Could not render chip channel '+(voice+1));
     const wave=module.HEAP16;
     for(let frame=0;frame<n;frame++){const left=wave[out/2+frame*2],right=wave[out/2+frame*2+1];sum+=(left*left+right*right)/2;carry++;
      if(carry===meterStep||pos+frame===meterSamples-1){voiceLevels[voice][slot++]=Math.min(255,Math.round(Math.sqrt(sum/carry)/32768*850));sum=0;carry=0}}
     if((pos/chunk)%16===15)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
   }
  }finally{module._gme_delete(meterEmu)}
 }finally{module._free(meterData);module._free(meterRef)}
 }finally{module._free(out)}return {pcm:pcm.buffer,sampleRate,stereo:true,lengthMs,track,voiceNames,voiceLevels:voiceLevels.map(levels=>levels.buffer),envelopeStep,envelopeSampleRate:11025}}finally{module._gme_delete(emu)};
}
