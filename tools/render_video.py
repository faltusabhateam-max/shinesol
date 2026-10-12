import math, subprocess, sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,30
F="/usr/share/fonts/truetype/sand-box/google/Poppins/Poppins-"
def font(w,s): return ImageFont.truetype(F+w+".ttf",s)
PINK=(255,47,166)
star=Image.open("public/brand/star.png").convert("RGBA")

def ease(t): t=max(0,min(1,t)); return 1-(1-t)**3
def ease_io(t): t=max(0,min(1,t)); return t*t*(3-2*t)

def radial(size,color,alpha):
    g=Image.new("L",(size,size),0); d=ImageDraw.Draw(g)
    for r in range(size//2,0,-2):
        v=int(alpha*(1-r/(size/2))**2.2); d.ellipse((size/2-r,size/2-r,size/2+r,size/2+r),fill=v)
    im=Image.new("RGBA",(size,size),color+(0,)); im.putalpha(g); return im
blob1=radial(900,PINK,150); blob2=radial(700,(140,40,255),90); blob3=radial(600,PINK,90)
random.seed(4)
parts=[(random.random()*W,random.random()*H,random.random()*1.5+0.5,random.random()*6.28) for _ in range(70)]
grid=Image.new("RGBA",(W,H),(0,0,0,0)); gd=ImageDraw.Draw(grid)
for x in range(0,W,64): gd.line((x,0,x,H),fill=(255,255,255,10))
for y in range(0,H,64): gd.line((0,y,W,y),fill=(255,255,255,10))

def background(t):
    im=Image.new("RGBA",(W,H),(5,3,8,255))
    im.alpha_composite(blob1,(int(W*0.62+160*math.sin(t*0.35)-450),int(H*0.35+90*math.cos(t*0.27)-450)))
    im.alpha_composite(blob2,(int(W*0.12+120*math.cos(t*0.22)-350),int(H*0.75+60*math.sin(t*0.31)-350)))
    im.alpha_composite(blob3,(int(W*0.95+80*math.sin(t*0.4)-300),int(H*0.95-300)))
    im.alpha_composite(grid)
    d=ImageDraw.Draw(im)
    for (x,y,s,ph) in parts:
        yy=(y-t*12*s)%H; a=int(60+60*math.sin(t*2+ph)); d.ellipse((x-s,yy-s,x+s,yy+s),fill=(255,150,210,a))
    return im

def glow(img,radius=18,strength=1.6):
    a=img.getchannel("A").filter(ImageFilter.GaussianBlur(radius))
    a=a.point(lambda v:min(255,int(v*strength)))
    g=Image.new("RGBA",img.size,PINK+(0,)); g.putalpha(a); return g

def pad(img,p):
    c=Image.new("RGBA",(img.width+2*p,img.height+2*p),(0,0,0,0)); c.alpha_composite(img,(p,p)); return c

S=200 # icon canvas
def icon(kind):
    im=Image.new("RGBA",(S,S),(0,0,0,0)); d=ImageDraw.Draw(im); w=9; c=(255,255,255,255); p=PINK+(255,)
    if kind=="mail":
        d.rounded_rectangle((30,52,170,148),18,outline=c,width=w); d.line((40,64,100,108,160,64),fill=p,width=w,joint="curve")
    elif kind=="wallet":
        d.rounded_rectangle((28,50,172,156),20,outline=c,width=w); d.rounded_rectangle((116,84,182,122),14,outline=p,width=w); d.ellipse((136,97,148,109),fill=p); d.line((44,50,140,30,150,50),fill=c,width=w,joint="curve")
    elif kind=="user":
        d.ellipse((70,30,130,90),outline=c,width=w); d.arc((36,100,164,220),200,340,fill=p,width=w)
    elif kind=="events":
        d.rounded_rectangle((32,44,168,164),18,outline=c,width=w); d.line((32,82,168,82),fill=c,width=w); d.line((70,28,70,58),fill=p,width=w); d.line((130,28,130,58),fill=p,width=w)
        for i in range(3):
            for j in range(2): d.rounded_rectangle((56+i*34,100+j*30,74+i*34,116+j*30),4,fill=p if (i+j)%2==0 else c)
    elif kind=="apply":
        d.rounded_rectangle((44,24,156,176),16,outline=c,width=w)
        for i,y in enumerate((62,92,122)): d.line((68,y,132 if i<2 else 106,y),fill=c if i else p,width=w)
        d.ellipse((118,128,178,188),fill=PINK+(255,)); d.line((134,158,145,169,164,146),fill=(255,255,255,255),width=7)
    elif kind=="check":
        d.ellipse((30,30,170,170),outline=c,width=w); d.line((66,102,90,126,136,76),fill=p,width=w+3,joint="curve")
    elif kind=="chat":
        d.rounded_rectangle((26,36,150,120),24,outline=c,width=w); d.polygon((50,118,50,146,80,118),fill=c)
        d.rounded_rectangle((86,90,176,156),20,fill=PINK+(255,)); 
        for x in (110,130,150): d.ellipse((x-6,117,x+6,129),fill=(255,255,255,255))
    elif kind=="sol":
        d.ellipse((24,24,176,176),outline=p,width=w)
        for i,y in enumerate((66,96,126)):
            off=-12 if i==1 else 12
            d.polygon((62+off,y-8,150+off,y-8,138-off,y+8,50-off,y+8),fill=c)
    elif kind=="withdraw":
        d.rounded_rectangle((28,96,172,168),18,outline=c,width=w); d.line((100,130,100,32),fill=p,width=w); d.line((66,64,100,30,134,64),fill=p,width=w,joint="curve")
    return im

SCENES=[
 ("mail","Sign up with email","Create your Shine account in seconds — no seed phrase needed."),
 ("wallet","Your Solana wallet is created","A secure Shine Wallet is generated for you automatically."),
 ("user","Set up your profile","Add your X, Telegram, Discord, avatar and a standout bio."),
 ("events","Browse opportunities","Explore Web3 jobs and programs posted by real projects."),
 ("apply","Apply with a signature","Sign with your Shine Wallet so projects receive your payout address."),
 ("check","Get approved","Projects review your application and approve the best fits."),
 ("chat","Chat directly","A private chat unlocks between you and the project."),
 ("sol","Get paid in SOL","Payments land straight in your Shine Wallet, on-chain."),
 ("withdraw","Withdraw anytime","Send your SOL to any Solana address whenever you like."),
]
SD=2.8; INTRO=2.6; OUTRO=2.8
TOTAL=INTRO+SD*len(SCENES)+OUTRO
cache={}
def text_sprite(txt,f,fill):
    key=(txt,f.path,f.size,fill)
    if key in cache: return cache[key]
    bb=f.getbbox(txt); im=Image.new("RGBA",(bb[2]+20,bb[3]+20),(0,0,0,0)); ImageDraw.Draw(im).text((10,10),txt,font=f,fill=fill); cache[key]=im; return im
fT=font("SemiBold",54); fS=font("Regular",25); fK=font("SemiBold",20); fB=font("Bold",120); fTag=font("Medium",30)

def place(base,spr,x,y,alpha=1.0,scale=1.0,center=False):
    if scale!=1.0: spr=spr.resize((max(1,int(spr.width*scale)),max(1,int(spr.height*scale))),Image.LANCZOS)
    if alpha<1: 
        a=spr.getchannel("A").point(lambda v:int(v*max(0,alpha))); spr=spr.copy(); spr.putalpha(a)
    if center: x-=spr.width//2; y-=spr.height//2
    base.alpha_composite(spr,(int(x),int(y)))

# glass disc
disc=Image.new("RGBA",(300,300),(0,0,0,0)); dd=ImageDraw.Draw(disc)
dd.ellipse((10,10,290,290),fill=(255,255,255,18),outline=(255,120,200,90),width=3)
icons={k:icon(k) for k,_,_ in SCENES}
iconglow={k:glow(pad(v,40),16,1.3) for k,v in icons.items()}
star_s={}
def star_img(sz,rot):
    s=star.resize((sz,sz),Image.LANCZOS).rotate(rot,resample=Image.BICUBIC,expand=True); return s
bigstar=star.resize((300,300),Image.LANCZOS); bigglow=glow(pad(bigstar,80),40,1.4)

def progress(base,idx,local):
    d=ImageDraw.Draw(base); n=len(SCENES); x0=W/2-(n-1)*40; y=H-46
    d.line((x0,y,x0+(n-1)*80,y),fill=(255,255,255,40),width=3)
    if idx>=0: d.line((x0,y,x0+min(n-1,idx+min(1,local))*80 if idx<n-1 else x0+(n-1)*80,y),fill=PINK+(220,),width=3)
    for i in range(n):
        x=x0+i*80; on=i<=idx
        r=9 if i==idx else 6
        d.ellipse((x-r,y-r,x+r,y+r),fill=PINK+(255,) if on else (60,40,60,255),outline=(255,255,255,90) if i==idx else None,width=2)

def frame(t):
    im=background(t)
    if t<INTRO:
        k=t/INTRO; e=ease(k/0.55)
        sz=int(60+240*e); rot=(1-e)*-120
        s=bigstar.resize((sz,sz),Image.LANCZOS).rotate(rot,resample=Image.BICUBIC,expand=True)
        g=bigglow.resize((int(bigglow.width*sz/300),int(bigglow.height*sz/300)),Image.LANCZOS)
        pulse=0.75+0.25*math.sin(t*5)
        place(im,g,W/2,H/2-70,alpha=e*pulse,center=True); place(im,s,W/2,H/2-70,alpha=min(1,e*1.2),center=True)
        a2=ease((k-0.35)/0.35)
        place(im,text_sprite("Shine",fB,(255,255,255,255)),W/2,H/2+150-20*a2,alpha=a2,center=True)
        a3=ease((k-0.55)/0.35)
        place(im,text_sprite("WEB3 JOBS  ·  PAID IN SOL",fK,PINK+(255,)),W/2,H/2+235,alpha=a3,center=True)
        if k>0.85: 
            fo=(k-0.85)/0.15; ov=Image.new("RGBA",(W,H),(5,3,8,int(255*ease_io(fo)*0.0))); im.alpha_composite(ov)
        return im
    t2=t-INTRO
    if t2 < SD*len(SCENES):
        idx=int(t2//SD); lt=(t2-idx*SD)/SD
        k,title,sub=SCENES[idx]
        ein=ease(lt/0.22); eout=ease_io((lt-0.86)/0.14); a=ein*(1-eout)
        cx=360; cy=H/2-20
        # disc + icon
        place(im,disc,cx,cy,alpha=a,scale=0.85+0.15*ein,center=True)
        place(im,iconglow[k],cx,cy-6*math.sin(t*2.2),alpha=a*(0.6+0.4*math.sin(t*4)),scale=0.9+0.1*ein,center=True)
        place(im,icons[k],cx,cy-6*math.sin(t*2.2),alpha=a,scale=0.9+0.1*ein,center=True)
        # orbiting star
        ang=t*1.6; ox=cx+150*math.cos(ang); oy=cy+150*math.sin(ang)*0.9
        place(im,star_img(46,t*90),ox,oy,alpha=a,center=True)
        # text
        tx=620; dx=(1-ein)*60
        place(im,text_sprite(f"STEP {idx+1:02d}",fK,PINK+(255,)),tx+dx,cy-110,alpha=a)
        # wrap title
        words=title.split(); lines=[]; cur=""
        for w_ in words:
            if fT.getlength(cur+" "+w_)>600 and cur: lines.append(cur); cur=w_
            else: cur=(cur+" "+w_).strip()
        lines.append(cur)
        y=cy-80
        for ln in lines:
            place(im,text_sprite(ln,fT,(255,255,255,255)),tx+dx*1.3,y,alpha=a); y+=66
        words=sub.split(); sl=[]; cur=""
        for w_ in words:
            if fS.getlength(cur+" "+w_)>560 and cur: sl.append(cur); cur=w_
            else: cur=(cur+" "+w_).strip()
        sl.append(cur); y+=14
        a_s=ease((lt-0.08)/0.22)*(1-eout)
        for ln in sl:
            place(im,text_sprite(ln,fS,(200,190,205,255)),tx+dx*1.6,y,alpha=a_s); y+=36
        d=ImageDraw.Draw(im); d.rounded_rectangle((tx+10,cy-130,tx+10+int(80*ein),cy-126),2,fill=PINK+(int(255*a),))
        progress(im,idx,lt)
        place(im,star_img(34,0),46,40,alpha=1); place(im,text_sprite("Shine",font("SemiBold",26),(255,255,255,255)),72,26)
        return im
    k=(t2-SD*len(SCENES))/OUTRO; e=ease(k/0.4)
    pulse=0.8+0.2*math.sin(t*4)
    place(im,bigglow,W/2,H/2-80,alpha=e*pulse,scale=0.8,center=True)
    place(im,star_img(240,math.sin(t*1.5)*8),W/2,H/2-80,alpha=e,center=True)
    place(im,text_sprite("Start shining.",font("SemiBold",64),(255,255,255,255)),W/2,H/2+110,alpha=ease((k-0.2)/0.3),center=True)
    place(im,text_sprite("Web3 opportunities, powered by Solana.",fTag,(220,200,215,255)),W/2,H/2+185,alpha=ease((k-0.35)/0.3),center=True)
    fo=ease_io((k-0.82)/0.18)
    if fo>0: im.alpha_composite(Image.new("RGBA",(W,H),(5,3,8,int(255*fo))))
    return im

if __name__=="__main__":
    if len(sys.argv)>1 and sys.argv[1]=="preview":
        for tt in [1.2,2.4,INTRO+1.4,INTRO+SD*4+1.2,INTRO+SD*7+1.4,TOTAL-1.5]:
            frame(tt).convert("RGB").save(f"/tmp/vf_{tt:.1f}.jpg",quality=85)
        sys.exit()
    n=int(TOTAL*FPS)
    p=subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-","-c:v","libx264","-preset","slow","-crf","23","-pix_fmt","yuv420p","-movflags","+faststart","public/media/how-it-works.mp4"],stdin=subprocess.PIPE)
    for i in range(n):
        p.stdin.write(frame(i/FPS).convert("RGB").tobytes())
        if i%90==0: print(i,n,flush=True)
    p.stdin.close(); p.wait(); print("done")
