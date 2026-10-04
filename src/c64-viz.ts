// CRT visualizer in the manner of the C64's VIC-II: a picture with a 320x200 display window inside a border that overscan trims,
// the 16 Pepto colours only, 8x8 character cells, 2x1 multicolour pixels, hardware sprites (24x21, expandable, 8 per
// scanline) multiplexed into two bands, raster bars and per-line border colours. The analogue CRT faults are always on but
// mostly asleep: a faint bass wobble, hum bar and noise, a tiny tick every ~17 s and one real glitch about once a minute.
// The buffer takes the shape of the tube. The 320x200 window sits in the middle; the border is what the glass leaves
// visible after overscan: 232 rows tall, and at least 355 wide so the window always fits.
export const C64_OVERSCAN_ROWS = 232;
export const C64_MIN_W = 355;
export const C64_BANDS = 40;

export const c64Presets = ['Raster bars', 'Sprite multiplex', 'Char plasma', 'SID spectrum', 'Rotozoom', 'Tunnel', 'Scope', 'Outrun', 'Open borders'];
export const c64PresetKeys = ['raster-bars', 'sprite-multiplex', 'char-plasma', 'sid-spectrum', 'rotozoom', 'tunnel', 'scope', 'outrun', 'open-borders'];
// What a PAL C64 could manage: 50 frames a second for raster and sprite work, every second frame for full-screen
// bitmap and char effects, every third frame for the chunky rotozoomer and tunnel.
export const C64_FPS = [50, 50, 25, 50, 16.7, 16.7, 25, 25, 50];

export const C64_FRAGMENT = `precision highp float;
uniform vec2 res;
uniform float time, vtime, bass, mids, treble, mode;
uniform float spec[40];
uniform float peaks[40];
#define PI 3.14159265
vec3 pc(float i){
  i=floor(i+.5);
  if(i<.5)return vec3(0.);
  if(i<1.5)return vec3(1.);
  if(i<2.5)return vec3(.408,.216,.169);
  if(i<3.5)return vec3(.439,.643,.698);
  if(i<4.5)return vec3(.435,.239,.525);
  if(i<5.5)return vec3(.345,.553,.263);
  if(i<6.5)return vec3(.208,.157,.475);
  if(i<7.5)return vec3(.722,.780,.435);
  if(i<8.5)return vec3(.435,.310,.145);
  if(i<9.5)return vec3(.263,.224,0.);
  if(i<10.5)return vec3(.604,.404,.349);
  if(i<11.5)return vec3(.267);
  if(i<12.5)return vec3(.424);
  if(i<13.5)return vec3(.604,.824,.518);
  if(i<14.5)return vec3(.424,.369,.710);
  return vec3(.584);
}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float rampIdx(float set,float v){
  float s=clamp(floor(v*6.),0.,5.);
  float k=floor(mod(set,4.)+.5);
  if(k<.5){if(s<.5)return 0.;if(s<1.5)return 6.;if(s<2.5)return 14.;if(s<3.5)return 3.;if(s<4.5)return 15.;return 1.;}
  if(k<1.5){if(s<.5)return 0.;if(s<1.5)return 9.;if(s<2.5)return 2.;if(s<3.5)return 8.;if(s<4.5)return 7.;return 1.;}
  if(k<2.5){if(s<.5)return 0.;if(s<1.5)return 11.;if(s<2.5)return 5.;if(s<3.5)return 13.;if(s<4.5)return 7.;return 1.;}
  if(s<.5)return 0.;if(s<1.5)return 6.;if(s<2.5)return 4.;if(s<3.5)return 10.;if(s<4.5)return 7.;return 1.;
}
float spriteCol(float k){
  if(k<.5)return 10.;if(k<1.5)return 7.;if(k<2.5)return 13.;if(k<3.5)return 3.;
  if(k<4.5)return 4.;if(k<5.5)return 14.;if(k<6.5)return 15.;return 8.;
}
float spriteDark(float k){
  if(k<.5)return 2.;if(k<1.5)return 8.;if(k<2.5)return 5.;if(k<3.5)return 6.;
  if(k<4.5)return 6.;if(k<5.5)return 6.;if(k<6.5)return 11.;return 9.;
}
float flashCol(float n){
  n=mod(n,5.);
  if(n<.5)return 1.;if(n<1.5)return 7.;if(n<2.5)return 3.;if(n<3.5)return 13.;return 10.;
}
// Returns a palette index for the pixel at p (top-left origin), border included.
float scene(vec2 p){
  float t=time*.8,b=bass,m=mids,h=treble;
  float x=floor(p.x),y=floor(p.y);
  vec2 org=floor((res-vec2(320.,200.))*.5);
  vec2 c=vec2(x,y)-org;
  bool inside=c.x>=0.&&c.x<320.&&c.y>=0.&&c.y<200.;
  float bidx=14.,idx=0.;
  float flash=step(.72,b);
  bool canFlash=true,openAll=false;
  float xm=floor(c.x/2.)*2.+1.;
  vec2 pm=vec2(xm-160.,c.y-100.)/100.;
  int md=int(floor(mode+.5));
  if(md==0){
    float o=0.,depth=-9.;
    for(int i=0;i<8;i++){
      float fi=float(i);
      float ph=t*(.8+fi*.11)+fi*.8;
      float cy=res.y*.5+sin(ph)*(res.y*.22+b*res.y*.2)+sin(t*.5+fi*1.7)*res.y*.065;
      float hh=9.+b*7.+m*3.;
      float d=abs(y-cy)/hh;
      if(d<1.){float z=cos(ph);if(z>depth){depth=z;o=rampIdx(fi,(1.-d)*1.12);}}
    }
    idx=o;bidx=o;canFlash=false;
  }else if(md==1){
    bidx=6.;
    idx=c.y>=100.?6.:0.;
    float spr=-1.;
    for(int i=0;i<16;i++){
      float fi=float(i);
      float band=floor(fi/8.);
      float k=mod(fi,8.);
      float ph=t*(.7+.09*k)+k*.85+band*2.1;
      float ex=mod(k,2.)<.5?step(.7,b):step(.58,m);
      float sw=24.*(1.+ex),sh=21.*(1.+ex);
      float sx=floor(160.-sw*.5+sin(ph)*(118.-sw*.3));
      float sy=floor(band*100.+3.+(.5+.5*sin(ph*1.31+k))*(94.-sh));
      float px=c.x-sx,py=c.y-sy;
      if(spr<0.&&px>=0.&&px<sw&&py>=0.&&py<sh){
        float u=floor(px/(1.+ex)),v=floor(py/(1.+ex));
        float u2=floor(u/2.);
        vec2 q=vec2((u2+.5-6.)*2.,v+.5-10.5)/10.5;
        float e=length(q),e2=length(q-vec2(-.3,-.3));
        if(e<1.){spr=e2<.28?1.:(e<.66?spriteCol(k):(e<.88?spriteDark(k):11.));}
      }
    }
    if(spr>=0.)idx=spr;
  }else if(md==2){
    bidx=6.;
    vec2 cell=floor(c/8.),loc=mod(c,8.);
    float v=sin(cell.x*.33+t*1.2)+sin(cell.y*.45-t*.9)+sin((cell.x+cell.y)*.21+t*.7)+sin(length(cell-vec2(20.,12.))*.5-t*1.5-b*5.);
    v=v*.125+.5+b*.18+m*.1;
    float L=floor(clamp(v,0.,.999)*5.);
    float odd_x=step(1.,mod(loc.x,2.)),odd_y=step(1.,mod(loc.y,2.));
    float dots=(1.-odd_x)*(1.-odd_y);
    float on=0.;
    if(L>3.5)on=1.;else if(L>2.5)on=1.-dots;else if(L>1.5)on=step(1.,mod(loc.x+loc.y,2.));else if(L>.5)on=dots;
    float set=mod(floor(cell.x/10.)+floor(t*.15),4.);
    idx=on>.5?rampIdx(set,v+.18):0.;
  }else if(md==3){
    bidx=11.;
    float colI=floor(c.x/8.),lev=0.,pk=0.;
    for(int i=0;i<40;i++){if(float(i)==colI){lev=spec[i];pk=peaks[i];}}
    float row=24.-floor(c.y/8.);
    float bar=step(row+.5,lev*25.);
    float isPeak=pk>.03?step(abs(row-floor(pk*25.)),.5):0.;
    float gap=max(step(7.,mod(c.y,8.)),step(7.,mod(c.x,8.)));
    float col=row<14.?5.:(row<20.?7.:10.);
    idx=gap>.5?0.:(isPeak>.5?1.:(bar>.5?col:0.));
    if(idx<.5&&mod(c.x,8.)==4.&&mod(c.y,8.)==4.)idx=11.;
  }else if(md==4){
    bidx=0.;
    float q=t*.45+sin(t*.3)*.8;
    mat2 R=mat2(cos(q),-sin(q),sin(q),cos(q));
    float zoom=1.6+.9*sin(t*.55)+b*.9;
    vec2 u=R*pm*zoom+vec2(t*.25,t*.17);
    float tex=.5+.5*sin(u.x*6.28)*sin(u.y*6.28);
    float chk=mod(floor(u.x)+floor(u.y),2.);
    float v=tex*.62+chk*.34+m*.14;
    vec2 cell=floor(c/16.);
    idx=rampIdx(cell.x+cell.y*2.,v*(.6+h*.5)+.08);
  }else if(md==5){
    bidx=0.;
    float r=length(pm)+.001,a=atan(pm.y,pm.x);
    float z=1./r;
    float v=fract(z*.45+t*.55+a*1.5/PI);
    float stripe=step(.5,fract(z*.9-t*1.1+a/PI*2.));
    float fog=smoothstep(.04,.45,r);
    idx=rampIdx(floor(a*2./PI+2.)+floor(t*1.2),(v*.8+stripe*.2)*fog+b*.1);
  }else if(md==6){
    bidx=14.;
    float trace=100.+sin(c.x*.05+t*3.)*(14.+m*40.)+sin(c.x*.19-t*2.)*(5.+h*20.)+sin(c.x*.011+t)*b*30.;
    float dy=abs(c.y-trace);
    idx=6.;
    if(mod(c.x,40.)==0.&&mod(c.y,25.)==0.)idx=14.;
    if(c.y==100.&&mod(c.x,4.)<1.)idx=14.;
    if(dy<1.)idx=1.;else if(dy<3.&&mod(c.x+c.y,2.)<1.)idx=14.;
  }else if(md==8){
    // Open borders: the top, bottom and side borders are hacked away. Sprites fly through the border, the side
    // borders show idle-state garbage from $3fff, and the whole area shares one raster-split background.
    openAll=true;canFlash=false;
    idx=rampIdx(0.,pow(y/res.y,1.3)*.5+.06);
    if(inside){
      float colI=floor(c.x/8.),lev=0.,pk=0.;
      for(int i=0;i<40;i++){if(float(i)==colI){lev=spec[i];pk=peaks[i];}}
      float row=24.-floor(c.y/8.);
      float bar=step(row+.5,lev*25.);
      float isPeak=pk>.03?step(abs(row-floor(pk*25.)),.5):0.;
      float gap=max(step(7.,mod(c.y,8.)),step(7.,mod(c.x,8.)));
      float col=row<14.?5.:(row<20.?7.:10.);
      if(gap<.5){if(isPeak>.5)idx=1.;else if(bar>.5)idx=col;}
    }else if(c.x<0.||c.x>=320.){
      float rowN=floor(y/2.);
      float on=step(.55-b*.4,hash2(vec2(rowN,floor(t*5.))));
      if(mod(x,2.)<1.&&on>.5)idx=14.;
      if(mod(x,8.)<1.&&hash2(vec2(rowN,floor(t*2.)+7.))>.5)idx=3.;
    }
    float spr=-1.;
    for(int i=0;i<8;i++){
      float k=float(i);
      float ph=t*(.55+.07*k)+k*.8;
      float sx=floor(res.x*.5-24.+sin(ph)*(res.x*.5-26.));
      float sy=floor(res.y*.5-21.+sin(ph*1.27+k)*(res.y*.5-23.));
      float px=x-sx,py=y-sy;
      if(spr<0.&&px>=0.&&px<48.&&py>=0.&&py<42.){
        float u2=floor(px/4.),v=floor(py/2.);
        vec2 q=vec2((u2+.5-6.)*2.,v+.5-10.5)/10.5;
        float e=length(q),e2=length(q-vec2(-.3,-.3));
        if(e<1.){spr=e2<.28?1.:(e<.66?spriteCol(k):(e<.88?spriteDark(k):11.));}
      }
    }
    if(spr>=0.)idx=spr;
  }else{
    bidx=0.;
    float hor=104.;
    if(c.y<hor){
      float v=pow(c.y/hor,1.25);
      idx=rampIdx(3.,v);
      vec2 sp=vec2(c.x-160.,c.y-(hor-34.-b*4.));
      float sr=40.+b*8.;
      if(length(sp)<sr){
        float vv=(sp.y+sr)/(2.*sr);
        float cut=sp.y>2.?step(mod(sp.y-floor(t*4.),8.),(sp.y/sr)*7.):0.;
        if(cut<.5)idx=vv<.4?7.:(vv<.7?10.:2.);
      }
    }else{
      float yy=c.y-hor+1.;
      float wx=(c.x-160.)/yy*4.;
      float z=48./yy;
      float gx=abs(fract(wx)-.5)*yy/4.;
      float gz=fract(z*.33-t*1.2);
      float line=max(step(abs(fract(wx+.5)-.5)*yy/4.,.75),step(gz,.05+.12*yy/96.));
      idx=line>.5?(b>.5?3.:4.):0.;
      if(yy<3.)idx=7.;
    }
  }
  if(canFlash&&flash>.5)bidx=flashCol(floor(time*14.));
  return (inside||openAll)?idx:bidx;
}
void main(){
  float x=floor(gl_FragCoord.x),y=res.y-1.-floor(gl_FragCoord.y);
  float b=bass,tt=vtime;
  float dx=0.,cs=1.;
  // The tube is clean most of the time: only a faint bass wobble, a barely visible hum bar and a little noise.
  dx+=floor(sin(y*.12+tt*9.)*b*.9+.5);
  // Rare small tick: a few scanlines flick sideways, about every 17 s.
  float e2=floor(tt/17.),l2=tt-e2*17.-hash(e2+9.)*13.;
  if(l2>=0.&&l2<.1){float y2=floor(hash(e2+4.)*(res.y-8.));if(y>=y2&&y<y2+3.)dx+=5.;}
  // Very rare real glitch, about once a minute: tearing bands, wide colour split, a flash and a burst of snow.
  float ev=floor(tt/55.),lt=tt-ev*55.-(4.+hash(ev+3.)*45.);
  float k=0.;
  if(lt>=0.&&lt<.55){
    k=1.-lt/.55;
    float step_=floor(lt*26.);
    for(int i=0;i<3;i++){
      float fi=float(i);
      float y0=floor(hash(ev*3.+fi*7.+step_)*(res.y-24.)),hh=6.+floor(hash(ev+fi+step_)*18.);
      if(y>=y0&&y<y0+hh)dx+=floor((hash2(vec2(y,step_+fi))-.5)*64.*k);
    }
    cs=1.+floor(3.*k);
  }
  vec2 p=vec2(x+dx,y);
  vec3 col=vec3(pc(scene(p+vec2(cs,0.))).r,pc(scene(p)).g,pc(scene(p-vec2(cs,0.))).b);
  float yb=mod(tt*18.,res.y+80.)-40.;
  col*=1.+.05*(1.-smoothstep(0.,36.,abs(y-yb)))-.03;
  col+=(hash2(vec2(x,y)+floor(tt*60.))-.5)*(.03+.42*k*k);
  col+=.14*k;
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
