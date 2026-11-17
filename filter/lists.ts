/**
 * Word lists for the explicit-word filter, stored in ROT13 so the public
 * repository does not show slurs and profanity as plain text. Decode with
 * rot13() in classify.ts (encoding and decoding are the same operation).
 *
 * LDNOOBW: single words from the "List of Dirty, Naughty, Obscene, and
 * Otherwise Bad Words" English list, (c) 2012-2020 Shutterstock, Inc.,
 * licensed under CC BY 4.0 (creativecommons.org/licenses/by/4.0), from
 * github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 * at commit 5faf2ba. Unchanged except that phrases and non-ASCII entries
 * are left out. Words in it count as explicit (profane) unless they are
 * also in SLURS.
 *
 * The other lists are this project's own.
 */

export const LDNOOBW = "2t1p npebgbzbcuvyvn nany navyvathf nahf ncrfuvg nefrubyr nff nffubyr nffzhapu nhgbrebgvp onorynaq onatoebf onatohf oneronpx oneranxrq onfgneq onfgneqb onfgvanqb ooj oqfz ornare ornaref ornfgvnyvgl orfgvnyvgl ovzobf oveqybpx ovgpu ovgpurf oybjwbo oyhzcxva obyybpxf obaqntr obare obbo obbof ohxxnxr ohyyqlxr ohyyfuvg ohatubyr ohfgl ohgg ohggpurrxf ohggubyr pnztvey pnzfyhg pnzjuber pnecrgzhapure pvnyvf pvepyrwrex pyvg pyvgbevf pyhfgreshpx pbpx pbpxf pbcebyntavn pbcebcuvyvn pbeaubyr pbba pbbaf pernzcvr phz phzzvat phzfubg phzfubgf phaavyvathf phag qnexvr qngrencr qrrcguebng qraqebcuvyvn qvpx qvyqb qvatyroreel qvatyroreevrf qbttvrfglyr qbttlfglyr qbyprgg qbzvangvba qbzvangevk qbzzrf qiqn rppuv rwnphyngvba rebgvp rebgvfz rfpbeg rhahpu snt snttbg srpny srypu sryyngvb srygpu srzqbz svttvat svatreonat svatrevat svfgvat sbbgwbo sebggvat shpx shpxva shpxvat shpxgneqf shqtrcnpxre shgnanev tnatonat travgnyf tbngpk tbngfr tbxxha tbbqcbbc tbertnfz tebcr t-fcbg theb unaqwbo uneqpber uragnv ubzbrebgvp ubaxrl ubbxre ubeal uhzcvat vaprfg vagrepbhefr wnvyonvg wvtnobb wvttnobb wvttreobb wvmm whttf xvxr xvaonxh xvaxfgre xvaxl xaboovat yvirfrk ybyvgn ybirznxvat znfgheongr znfgheongvat znfgheongvba zvys zbat zbgureshpxre zhssqvivat anzoyn anjnfuv arteb arbanmv avttn avttre avzcubznavn avccyr avccyrf afsj ahqr ahqvgl ahggra alzcub alzcubznavn bpgbchffl bzbenfuv betnfz betl cnrqbcuvyr cnxv cnagvrf cnagl crqborne crqbcuvyr crttvat cravf cvxrl cvffvat cvffcvt cynlobl cbalcynl cbbs cbba cbbagnat chanal cbbcpuhgr cbea cbeab cbeabtencul cgup chorf chffl dhrns dhrrs dhvz enturnq encr encvat encvfg erpghz evzwbo evzzvat fnqvfz fnagbehz fpng fpuybat fpvffbevat frzra frk frkpnz frkb frkl frkhny frkhnyyl frkhnyvgl furznyr fuvonev fuvg fuvgoyvzc fuvggl fubgn fuevzcvat fxrrg fynagrlr fyhg f&z fzhg fangpu fabjonyyvat fbqbzvmr fbqbzl fcnfgvp fcvp fcybbtr fcbbtr fchax fgencba fgenccnqb fhpx fhpxf fjnfgvxn fjvatre guerrfbzr guebngvat guhzomvyyn gvg gvgf gvggvrf gvggl gbcyrff gbffre gbjryurnq genaal gevonqvfz ghotvey ghful gjng gjvax gjvaxvr haqerffvat hcfxveg hebcuvyvn intvan ivnten ivoengbe ibenercuvyvn iblrhe iblrhejro iblhre ihyin jnax jrgonpx juber jbeyqfrk kk kkk lnbv lvssl mbbcuvyvn";

/** Slurs: hate words about race, ethnicity, sexuality, gender or disability. Off unless the slur toggle is on. */
export const SLURS = "ornare ornaref ohyyqlxr pnecrgzhapure pbba pbbaf qnexvr snt sntf snttbg snttbgf snttl shqtrcnpxre ubaxrl ubaxl wvtnobb wvttnobb wvttreobb xvxr xvxrf zbat arteb artebrf avttn avttnf avttre avttref avtyrg cnxv cnxvf cvxrl cbbs cbbsf cbbsgre enturnq enturnqf furznyr furznyrf fynagrlr fcvp fcvpf fcvpx fcnfgvp fcnm gbjryurnq gbjryurnqf genaal genaavrf jrgonpx jrgonpxf puvax puvaxf tbbx tbbxf wnc wncf mvccreurnq qlxr qlxrf ubzb ubzbf ergneq ergneqf ergneqrq gneq gneqf fnzob fnzobf cbepuzbaxrl erqfxva erqfxvaf vawha fdhnj jbc jbcf qntb qntbf xenhg xenhgf cbynpx cbynpxf tlccb urro ulzvr tbyyvjbt";

/** Profanity and crude words not in LDNOOBW. */
export const PROFANE = "nefr nefrf nefrubyr nffung nffjvcr onqnff qhzonff wnpxnff fznegnff xvpxnff uneqnff sngnff yneqnff ovgpul ovgpuvat obyybpx ohyyfuvg ohggubyr pbpxfhpxre penc penccl qnza qnzzvg qnzarq tbqqnza tbqqnzarq uryy uryyf qbhpur qbhpuront qvpxurnq qvpxurnqf qvpxf ubr ubrf ubeal wrexbss cvff cvffrq cvffrf cvffl cevpx cevpxf chffvrf fyhgf fyhggl fxnax fxnaxl gubg gubgf gvggl juberf jubevat jnaxre jnaxref gbffre oryyraq xabournq ohttre oybjwbof unaqwbof qvyqbf obbovrf obbovr zbgureshpxvat zhgunshpxn zbgunshpxn phz phzf fzhg cbeab funt funttvat";

/** Roots that are explicit wherever they appear inside a word (no innocent word contains them). */
export const CONTAINS_PROFANE = "shpx fuvg phag wvmm juber fyhg qvyqb cbea ovgpu";
export const CONTAINS_SLUR = "avtt sntt";

/** Innocent words that happen to contain a root above. */
export const ALLOW = "avttyr avttyrf avttyrq avttyvat avttneq avttneqf avttneqyl avttneqyvarff avttyre avttyref avttyvatyl favttre favttref favttrerq favttrevat favttrere favttrevatyl favttyr zvfuvg zvfuvgf zvfuvggvat ohggre ohggref ohggrerq ohggrel ohggr ohggrf ohggrq ohggvat fpng fpngf fpnggrq fpnggvat fpnggl fpnggre fpnggref fpnggrerq fpnggrevat puvaxrq puvaxvat pbpxl pbpxvre pbpxvrfg pbpxrq pbpxvat pbpxre pbpxref rfpbeg rfpbegf rfpbegrq rfpbegvat ubrq ubrvat ubl cevpxrq cevpxvat cevpxyl cevpxre cevpxref ergneqvat ergneqre ergneqref funttl funttvre funttvrfg fangpu fangpurq fangpurf fangpuvat fangpure fangpuref fangpul fcvpr fcvprq fcvprf fcvpl fcvpvre fcvpvrfg fcvpvat fcvpre fhpx fhpxf fhpxrq fhpxvat fhpxre fhpxref gneql gneqvre gneqvrfg gvggre gvggref gvggrerq gvggrevat gvgre gvgref pencr pencrf penccvr penccvrf phzva qvpxre qvpxref svatrevat svatrevatf wncr wncrq wncrf wncvat wncre zbatre zbatref encvre encvref fxrrgre fxrrgref fchaxl fchaxvre fchaxvrfg gjvaxyl ivoengbel ornarel uneqpber gjvaxvr gjvaxvrf qbzvangvba";
