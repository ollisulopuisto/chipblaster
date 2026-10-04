// CRT visualizer in the manner of the C64's VIC-II: a picture with a 320x200 display window inside a border that overscan trims,
// the 16 Pepto colours only, 8x8 character cells, 2x1 multicolour pixels, hardware sprites (24x21, expandable, 8 per
// scanline) multiplexed into two bands, raster bars and per-line border colours. The analogue CRT faults are always on but
// mostly asleep: a faint bass wobble, hum bar and noise, a tiny tick every ~17 s and one real glitch about once a minute.
// The buffer is 368 wide (a 24 px border at the sides) and between 230 and 283 rows tall, so the 320x200 window always has a thin
// C64-sized border on every side. The tube stretches it to its own shape, so pixels may come out wider or taller than square.
export const C64_BUF_W = 368;
export const C64_ASPECT_MIN = 1.3;
export const C64_ASPECT_MAX = 1.6;
export const C64_BANDS = 40;

export const c64Presets = ['Raster bars', 'Sprite multiplex', 'Char plasma', 'SID spectrum', 'Rotozoom', 'Tunnel', 'Scope', 'Outrun', 'Open borders', 'DYCP scroller', 'FLD plasma', 'FLI picture', 'Linecrunch', 'Chess zoomer', 'AFLI plasma', 'Dot plotter', 'Parallax floor', 'Shadow cube', 'Rotating bars', 'Zoomscroll', 'Stick dancer', 'Noisefader', 'Chips DNA', 'Circle scroll', 'Balloons'];
export const c64PresetKeys = ['raster-bars', 'sprite-multiplex', 'char-plasma', 'sid-spectrum', 'rotozoom', 'tunnel', 'scope', 'outrun', 'open-borders', 'dycp', 'fld', 'fli', 'linecrunch', 'chess-zoomer', 'afli-plasma', 'dot-plotter', 'parallax-floor', 'shadow-cube', 'rotating-bars', 'zoomscroll', 'stick-dancer', 'noisefader', 'chips-dna', 'circle-scroll', 'balloons'];
// What a PAL C64 could manage: 50 frames a second for raster and sprite work, every second frame for full-screen
// bitmap and char effects, every third frame for the chunky rotozoomer and tunnel.
export const C64_FPS = [50, 50, 25, 50, 16.7, 16.7, 25, 25, 50, 50, 50, 25, 50, 25, 25, 25, 50, 16.7, 50, 50, 25, 25, 50, 25, 50];

// The C64's own character ROM shapes for the letters of the scroll text (8 rows each) and the text, packed for the shader.
const GLYPHS: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0, 0],
  A: [0x18, 0x3c, 0x66, 0x7e, 0x66, 0x66, 0x66, 0],
  B: [0x7c, 0x66, 0x66, 0x7c, 0x66, 0x66, 0x7c, 0],
  C: [0x3c, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3c, 0],
  D: [0x78, 0x6c, 0x66, 0x66, 0x66, 0x6c, 0x78, 0],
  E: [0x7e, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7e, 0],
  H: [0x66, 0x66, 0x66, 0x7e, 0x66, 0x66, 0x66, 0],
  I: [0x3c, 0x18, 0x18, 0x18, 0x18, 0x18, 0x3c, 0],
  L: [0x60, 0x60, 0x60, 0x60, 0x60, 0x60, 0x7e, 0],
  P: [0x7c, 0x66, 0x66, 0x7c, 0x60, 0x60, 0x60, 0],
  R: [0x7c, 0x66, 0x66, 0x7c, 0x78, 0x6c, 0x66, 0],
  S: [0x3c, 0x66, 0x60, 0x3c, 0x06, 0x66, 0x3c, 0],
  T: [0x7e, 0x18, 0x18, 0x18, 0x18, 0x18, 0x18, 0],
};
const GLYPH_ORDER = Object.keys(GLYPHS);
export const C64_FONT = new Float32Array(GLYPH_ORDER.length * 3);
GLYPH_ORDER.forEach((ch, g) => {
  const rows = GLYPHS[ch];
  for (let w = 0; w < 3; w++) {
    let v = 0;
    for (let r = 0; r < 3; r++) v = v * 256 + (rows[w * 3 + r] ?? 0);
    C64_FONT[g * 3 + w] = v;
  }
});
const SCROLL = '  CHIPBLASTER  SID  BLAST  ';
export const C64_SCROLL_LEN = SCROLL.length;
export const C64_MSG = new Float32Array(4);
for (let i = 0; i < SCROLL.length; i++) {
  const g = Math.max(0, GLYPH_ORDER.indexOf(SCROLL[i]));
  C64_MSG[Math.floor(i / 6)] += g * Math.pow(13, i % 6);
}

export const C64_FRAGMENT = `precision highp float;
uniform vec2 res;
uniform float time, vtime, bass, mids, treble, mode;
uniform float spec[40];
uniform float peaks[40];
uniform vec3 font[13];
uniform vec4 msg;
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
float bay2(float a,float b){return mod(a*2.+b*3.,4.);}
float bayer(vec2 p){vec2 q=mod(floor(p),4.);return (bay2(mod(q.x,2.),mod(q.y,2.))*4.+bay2(floor(q.x/2.),floor(q.y/2.))+.5)/16.;}
vec3 rotY(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z);}
vec3 rotX(vec3 v,float a){float c=cos(a),s=sin(a);return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z);}
float dseg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float boxHit(vec3 o,vec3 d,vec3 h,out vec3 n){
  vec3 inv=1./d;vec3 t1=(-h-o)*inv,t2=(h-o)*inv;
  vec3 tn=min(t1,t2),tf=max(t1,t2);
  float tmin=max(max(tn.x,tn.y),tn.z),tmax=min(min(tf.x,tf.y),tf.z);
  n=vec3(0.);
  if(tmax<0.||tmin>tmax)return -1.;
  if(tmin>0.){
    if(tn.x>=tn.y&&tn.x>=tn.z)n=vec3(-sign(d.x),0.,0.);
    else if(tn.y>=tn.z)n=vec3(0.,-sign(d.y),0.);
    else n=vec3(0.,0.,-sign(d.z));
    return tmin;
  }
  return tmax;
}
float plasmaIdx(vec2 c,float t,float b,float m){
  vec2 cell=floor(c/8.),loc=mod(c,8.);
  float v=sin(cell.x*.33+t*1.2)+sin(cell.y*.45-t*.9)+sin((cell.x+cell.y)*.21+t*.7)+sin(length(cell-vec2(20.,12.))*.5-t*1.5-b*5.);
  v=v*.125+.5+b*.18+m*.1;
  float L=floor(clamp(v,0.,.999)*5.);
  float odd_x=step(1.,mod(loc.x,2.)),odd_y=step(1.,mod(loc.y,2.));
  float dots=(1.-odd_x)*(1.-odd_y);
  float on=0.;
  if(L>3.5)on=1.;else if(L>2.5)on=1.-dots;else if(L>1.5)on=step(1.,mod(loc.x+loc.y,2.));else if(L>.5)on=dots;
  float set=mod(floor(cell.x/10.)+floor(t*.15),4.);
  return on>.5?rampIdx(set,v+.18):0.;
}
float specIdx(vec2 c){
  float colI=floor(c.x/8.),lev=0.,pk=0.;
  for(int i=0;i<40;i++){if(float(i)==colI){lev=spec[i];pk=peaks[i];}}
  float row=24.-floor(c.y/8.);
  float bar=step(row+.5,lev*25.);
  float isPeak=pk>.03?step(abs(row-floor(pk*25.)),.5):0.;
  float gap=max(step(7.,mod(c.y,8.)),step(7.,mod(c.x,8.)));
  float col=row<14.?5.:(row<20.?7.:10.);
  float o=gap>.5?0.:(isPeak>.5?1.:(bar>.5?col:0.));
  if(o<.5&&mod(c.x,8.)==4.&&mod(c.y,8.)==4.)o=11.;
  return o;
}
float glyphBit(float g,float gx,float gy){
  vec3 f=vec3(0.);
  for(int i=0;i<13;i++){if(float(i)==g)f=font[i];}
  float w=floor(gy/3.);
  float word=w<.5?f.x:(w<1.5?f.y:f.z);
  float bit=(2.-mod(gy,3.))*8.+(7.-gx);
  return mod(floor(word/exp2(bit)),2.);
}
float msgGlyph(float n){
  n=mod(n,${C64_SCROLL_LEN}.);
  float word=floor(n/6.),d=mod(n,6.);
  float v=word<.5?msg.x:(word<1.5?msg.y:(word<2.5?msg.z:msg.w));
  return mod(floor(v/pow(13.,d)+.001),13.);
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
    idx=plasmaIdx(c,t,b,m);
  }else if(md==3){
    bidx=11.;
    idx=specIdx(c);
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
  }else if(md==9){
    // DYCP: every character column of the scroller has its own vertical position; letters take their colour from the raster line.
    bidx=0.;
    idx=mod(floor(c.y/6.),2.)<1.?rampIdx(0.,.1):0.;
    float sx=c.x+floor(t*46.);
    float n=floor(sx/24.);
    float dy=floor(sin(n*.62+t*2.6)*(34.+b*30.)+sin(n*.21+t)*12.);
    float py=floor((c.y-(78.+dy))/3.),gx=floor(mod(sx,24.)/3.);
    if(py>=0.&&py<8.&&glyphBit(msgGlyph(n),gx,py)>.5)idx=rampIdx(floor(c.y/36.+t*.6),.45+.5*fract(c.y/36.));
  }else if(md==10){
    // FLD: the char rows are pushed down by delaying the bad lines; the top line is smeared over the gap.
    bidx=6.;
    float d=floor(b*64.+(.5+.5*sin(t*1.6))*28.);
    float sy=max(0.,c.y-d);
    idx=plasmaIdx(vec2(c.x,sy),t,b,m);
  }else if(md==11){
    // FLI: a new colour attribute on every raster line (the 3-column FLI bug on the left shows garbage).
    bidx=0.;
    float cx=floor(c.x/2.)*2.+1.;
    float r=length(vec2(cx-160.,c.y-100.)*vec2(1.,1.2));
    float a=atan(c.y-100.,cx-160.);
    float v=.5+.5*sin(r*.09-t*2.2+sin(a*5.+t)*1.4)+b*.25;
    float set=floor(mod(c.y,8.)*.5+floor(r/40.)+floor(t*.8));
    idx=rampIdx(set,v*.95);
    if(c.x<24.)idx=hash2(vec2(floor(c.y/2.),floor(t*8.)))>.5?15.:(mod(c.y,8.)<4.?0.:11.);
  }else if(md==12){
    // Linecrunch: raster lines are deleted and repeated, so the picture squeezes and stretches like a rubber sheet.
    bidx=11.;
    float sy=c.y+30.*sin(c.y*.034+t*1.8)+12.*sin(c.y*.09-t*2.7);
    idx=specIdx(vec2(c.x,clamp(sy,0.,199.)));
  }else if(md==13){
    // Chess zoomer (Edge of Disgrace): a chunky 4x4 chessboard zoom with sprites waving over it, each stretched by its own zoom.
    bidx=6.;
    float xm4=floor(c.x/4.)*4.+2.,ym4=floor(c.y/4.)*4.+2.;
    vec2 p4=vec2(xm4-160.,ym4-100.)/100.;
    float z=exp2(fract(t*.3)*2.);
    float a=sin(t*.4)*.6;
    vec2 q=vec2(cos(a)*p4.x-sin(a)*p4.y,sin(a)*p4.x+cos(a)*p4.y)*2./z+vec2(t*.1,0.);
    float chk=mod(floor(q.x)+floor(q.y),2.);
    idx=chk>.5?rampIdx(0.,.6+.25*b):rampIdx(0.,.22);
    float spr=-1.;
    for(int i=0;i<8;i++){
      float k=float(i);
      float sx=36.+k*34.,sy=100.+sin(t*3.+k*.75)*48.,sz=1.+.6*sin(t*2.2+k*.9);
      vec2 d=vec2(c.x-sx,c.y-sy);
      float e=length(d)/(11.*sz);
      if(spr<0.&&e<1.){spr=length(d+vec2(3.*sz))/(11.*sz)<.28?1.:(e<.7?spriteCol(k):spriteDark(k));}
    }
    if(spr>=0.)idx=spr;
  }else if(md==14){
    // AFLI plasma (Edge of Disgrace): a double-sine plasma in hires with a new colour pair every few raster lines.
    bidx=6.;
    float v=(sin(c.x*.045+sin(c.y*.05+t*1.1)*2.)+sin(c.y*.07+sin(c.x*.03-t)*2.)+sin((c.x+c.y)*.03+t*.7))/6.+.5+b*.15;
    v+=(bayer(c)-.5)*.3;
    idx=rampIdx(mod(floor(c.y/4.)+floor(c.x/80.),4.),v);
  }else if(md==15){
    // Dot plotter (Edge of Disgrace): 96 dots morphing between a sphere, a torus and a heart.
    bidx=0.;idx=0.;
    float sh=mod(floor(t*.22),3.),f=smoothstep(.55,1.,fract(t*.22));
    float a1=t*.8,a2=.45+sin(t*.4)*.35;
    float bestz=-9.;
    for(int i=0;i<96;i++){
      float u=(float(i)+.5)/96.;
      float phi=acos(1.-2.*u),th=float(i)*2.3999632;
      vec3 S0=vec3(sin(phi)*cos(th),cos(phi),sin(phi)*sin(th))*.85;
      float v1=u*6.2831853*10.,v2=u*6.2831853;
      vec3 S1=vec3((.62+.26*cos(v1))*cos(v2),.26*sin(v1),(.62+.26*cos(v1))*sin(v2));
      float sn=sin(v2);
      vec3 S2=vec3(16.*sn*sn*sn,13.*cos(v2)-5.*cos(2.*v2)-2.*cos(3.*v2)-cos(4.*v2)+1.,sin(u*30.)*4.5)/17.;
      vec3 A=sh<.5?S0:(sh<1.5?S1:S2);
      vec3 B=sh<.5?S1:(sh<1.5?S2:S0);
      vec3 pos=rotX(rotY(mix(A,B,f),a1),a2);
      vec2 sp=vec2(160.,100.)+vec2(pos.x,-pos.y)*100./(1.9-pos.z*.45);
      float d=length(c-sp);
      if(d<1.5+(pos.z+1.)*.8&&pos.z>bestz){bestz=pos.z;idx=rampIdx(floor(t*.5+u*3.),.35+.6*(pos.z*.5+.5));}
    }
  }else if(md==16){
    // Parallax floor (Coma Light 13): hill layers sliding at different speeds above a floor whose raster lines scroll at their own speed.
    bidx=0.;
    float hor=100.;
    if(c.y<hor){
      idx=rampIdx(0.,.1+.5*pow(c.y/hor,1.2));
      for(int l=0;l<4;l++){
        float fl=float(l);
        float xs=c.x+t*(10.+fl*14.);
        float hh=hor-18.-fl*10.-(sin(xs*.026*(1.+fl*.35)+fl*2.)*(9.+fl*3.)+sin(xs*.011+fl)*8.);
        if(c.y>hh)idx=fl<.5?14.:(fl<1.5?6.:(fl<2.5?5.:11.));
      }
    }else{
      float yy=c.y-hor+1.;
      float u=(c.x-160.)/yy*5.+t*3.;
      float zf=60./yy;
      float chk=mod(floor(u)+floor(zf*.8-t*2.),2.);
      idx=chk>.5?5.:13.;
      if(yy<2.)idx=1.;
    }
  }else if(md==17){
    // Shadow cube (Coma Light 13): a flat-shaded rotating cube casting a real-time shadow on a chessboard floor.
    bidx=6.;
    vec2 uv=vec2(c.x-160.,100.-c.y)/100.;
    vec3 ro=vec3(0.,1.4,-3.3),rd=normalize(vec3(uv.x*.8,uv.y*.8-.3,1.));
    float ang=t*.7;
    vec3 L=normalize(vec3(-.55,1.,-.45));
    vec3 cc=vec3(0.,.62,0.),hb=vec3(.55);
    vec3 n1;
    float tb=boxHit(rotY(ro-cc,-ang),rotY(rd,-ang),hb,n1);
    float tf=rd.y<-.001?(-ro.y/rd.y):-1.;
    idx=rampIdx(0.,.2+uv.y*.2);
    if(tb>0.&&(tf<0.||tb<tf)){
      vec3 n=rotY(n1,ang);
      float lit=clamp(dot(n,L),0.,1.);
      idx=rampIdx(1.,.25+.7*lit+(bayer(c)-.5)*.14);
    }else if(tf>0.){
      vec3 P=ro+rd*tf;
      vec3 n2;
      float ts=boxHit(rotY(P+L*.002-cc,-ang),rotY(L,-ang),hb,n2);
      float chk=mod(floor(P.x*1.2)+floor(P.z*1.2),2.);
      float base=chk>.5?.62:.42;
      if(ts>0.)base*=.45;
      base=base*(1.-.06*length(P.xz))+(bayer(c)-.5)*.14;
      idx=rampIdx(0.,base+.1);
    }
  }else if(md==18){
    // Rotating raster bars (Uncensored): bars that turn through 360 degrees, across the border as well.
    openAll=true;canFlash=false;
    vec2 pp=vec2(x,y)-res*.5;
    vec2 nrm=vec2(cos(t*.5),sin(t*.5));
    float o=0.,depth=-9.;
    for(int i=0;i<8;i++){
      float fi=float(i);
      float off=sin(t*.8+fi*.9)*res.y*.3,zz=cos(t*.8+fi*.9),hh=8.+b*6.;
      float d=abs(dot(pp,nrm)-off)/hh;
      if(d<1.&&zz>depth){depth=zz;o=rampIdx(fi,(1.-d)*1.12);}
    }
    idx=o;
  }else if(md==19){
    // Zoomscroll (Uncensored): letters zoom up through the whole picture, borders included.
    openAll=true;canFlash=false;
    vec2 pp=vec2(x,y)-res*.5;
    float cyc=t*.45,n=floor(cyc),fr=fract(cyc);
    float zoom=exp2(fr*4.5)*.5;
    vec2 gp=pp/zoom+vec2(4.,4.);
    idx=rampIdx(0.,.08+.1*mod(floor(y/4.),2.));
    if(gp.x>=0.&&gp.x<8.&&gp.y>=0.&&gp.y<8.&&glyphBit(msgGlyph(n),floor(gp.x),floor(gp.y))>.5)idx=rampIdx(floor(n),.5+.5*fract(y/24.+fr));
  }else if(md==20){
    // Stick dancer (Comaland): a zoomed vector stick figure dancing to the bass.
    bidx=6.;
    idx=mod(floor(c.y/4.),2.)<1.?rampIdx(0.,.07):0.;
    float zm=1.+b*.35;
    vec2 pp=vec2(c.x-160.,110.-c.y)/zm;
    float s6=t*5.;
    vec2 hip=vec2(sin(s6*.5)*5.,-8.+sin(s6)*3.);
    vec2 neck=hip+vec2(sin(s6*.5+1.)*4.,40.);
    vec2 head=neck+vec2(sin(s6*.5)*3.,11.);
    vec2 shL=neck+vec2(-9.,-3.),shR=neck+vec2(9.,-3.);
    vec2 haL=shL+vec2(-16.-sin(s6)*6.,6.+cos(s6)*16.),haR=shR+vec2(16.+sin(s6+2.)*6.,6.+cos(s6+2.)*16.);
    vec2 kL=hip+vec2(-9.,-22.+sin(s6)*3.),kR=hip+vec2(9.,-22.-sin(s6)*3.);
    vec2 fL=kL+vec2(-5.+sin(s6)*9.,-22.+max(0.,sin(s6))*7.),fR=kR+vec2(5.+sin(s6+3.14)*9.,-22.+max(0.,sin(s6+3.14))*7.);
    float d=min(dseg(pp,hip,neck),dseg(pp,shL,shR));
    d=min(d,min(dseg(pp,shL,haL),dseg(pp,shR,haR)));
    d=min(d,min(dseg(pp,hip,kL),dseg(pp,hip,kR)));
    d=min(d,min(dseg(pp,kL,fL),dseg(pp,kR,fR)));
    d=min(d,abs(length(pp-head)-6.));
    if(d<1.4)idx=1.;else if(d<3.2&&bayer(c)<.5)idx=14.;
  }else if(md==21){
    // Noisefader (Next Level): two effects dissolve into each other through a pixel noise threshold.
    bidx=11.;
    float prog=smoothstep(0.,1.,.5+.65*sin(t*.55));
    idx=hash2(floor(c)+7.)<prog?specIdx(c):plasmaIdx(c,t,b,m);
  }else if(md==22){
    // Chips DNA (Viva Las Vegas): a double helix with cross rungs, shaded by depth.
    bidx=0.;idx=0.;
    float ph=c.x*.045+t*2.;
    float y1=100.+sin(ph)*(52.+b*14.),y2=100.-sin(ph)*(52.+b*14.);
    float z1=cos(ph);
    if(mod(c.x,10.)<2.&&c.y>min(y1,y2)&&c.y<max(y1,y2))idx=rampIdx(2.,.35+.15*mod(floor(c.x/10.),3.));
    float s1=abs(c.y-y1),s2=abs(c.y-y2);
    float th1=3.+z1*1.6,th2=3.-z1*1.6;
    if(s2<th2)idx=rampIdx(0.,.6-z1*.25);
    if(s1<th1)idx=rampIdx(1.,.6+z1*.3);
  }else if(md==23){
    // Circle scroll (Viva Las Vegas): the scroll text runs round a circle.
    bidx=0.;idx=0.;
    vec2 pp=c-vec2(160.,100.);
    float r=length(pp),ang=atan(pp.y,pp.x)+t*.45;
    float R0=51.6;
    if(r>=R0&&r<R0+16.){
      float sc=mod(ang,6.2831853)*R0;
      float n=floor(sc/12.);
      float gx=floor(mod(sc,12.)/1.5),gy=floor((R0+16.-r)/2.);
      if(glyphBit(msgGlyph(n),gx,gy)>.5)idx=rampIdx(floor(ang*1.3+t),.55+.4*sin(ang*3.));
    }
    if(r<40.&&mod(floor(r/6.)+floor(ang*4.),2.)<1.&&mod(r,6.)<3.)idx=rampIdx(2.,.35);
  }else if(md==24){
    // Balloons (The Hat): balloon sprites drifting upwards, each with its own speed and size.
    bidx=6.;
    idx=rampIdx(0.,.12+.4*(c.y/200.));
    float best=-1.;
    for(int i=0;i<12;i++){
      float k=float(i);
      float hs=hash(k+1.);
      float bx=24.+hash(k+40.)*272.+sin(t*(.6+hs)+k)*10.;
      float by=mod(260.-(t*(14.+hs*26.)+hash(k+80.)*260.),260.)-30.;
      float rr=9.+hash(k+120.)*9.;
      vec2 d=vec2(c.x-bx,(c.y-by)/1.25);
      float e=length(d)/rr;
      if(best<0.){
        if(e<1.){best=length(d/rr-vec2(-.3,-.3))<.25?1.:(e<.7?spriteCol(mod(k,8.)):spriteDark(mod(k,8.)));}
        else if(abs(c.x-bx)<.6&&c.y>by+rr*1.25&&c.y<by+rr*1.25+28.)best=15.;
      }
    }
    if(best>=0.)idx=best;
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
