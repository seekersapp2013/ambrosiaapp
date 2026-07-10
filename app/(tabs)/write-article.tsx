/**
 * Write Article Screen — Route: /(tabs)/write-article
 * 3-step wizard: Content → Details → Settings
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Image, Alert, StyleSheet,
  ActivityIndicator, Switch, Platform, Modal, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { useRouter, Redirect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { Colors as TokenColors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { WizardProgressBar } from "@/components/ui/ScreenHeader";
import { useTabBarHeight } from "@/utils/useDeviceClass";
import { CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS } from "@/utils/currency";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

// ─── Wizard constants ─────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;
const STEP_LABELS = ["Content", "Details", "Settings"];
const STEP_SUBTITLES = [
  "Write your article",
  "Cover image, tags, and visibility",
  "Review settings and publish",
];

// ─── Lazy native editor ───────────────────────────────────────────────────────
let RichEditor: any = null;
let RichToolbar: any = null;
let richActions: any = null;
if (Platform.OS !== "web") {
  try {
    const p = require("react-native-pell-rich-editor");
    RichEditor = p.RichEditor;
    RichToolbar = p.RichToolbar;
    richActions = p.actions;
  } catch { /**/ }
}


// ─── Web iframe HTML ──────────────────────────────────────────────────────────
const WEB_EDITOR_HTML: string = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0f0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#D1D5DB;font-size:14px}
#menubar{display:flex;align-items:center;gap:2px;background:#0a0a15;border-bottom:1px solid rgba(255,255,255,0.07);padding:3px 8px;flex-wrap:wrap}
.menu-item{position:relative}
.menu-btn{background:none;border:none;color:#9CA3AF;padding:5px 9px;font-size:12px;cursor:pointer;border-radius:4px;white-space:nowrap;transition:all 0.12s}
.menu-btn:hover,.menu-btn.open{background:rgba(255,255,255,0.07);color:#fff}
.dropdown{display:none;position:absolute;top:100%;left:0;min-width:180px;background:#141428;border:1px solid rgba(198,34,41,0.30);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.55);z-index:200;padding:4px 0;margin-top:2px}
.dropdown.show{display:block}
.dropdown hr{border:none;border-top:1px solid rgba(255,255,255,0.08);margin:3px 0}
.dd-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:12px;color:#D1D5DB;white-space:nowrap;transition:background 0.1s}
.dd-item:hover{background:rgba(198,34,41,0.15);color:#fff}
.dd-item .shortcut{margin-left:auto;color:#6B7280;font-size:10px}
.dd-item .icon{width:14px;text-align:center;opacity:0.7}
#toolbar{display:flex;align-items:center;gap:2px;background:#0f0f1e;border-bottom:1px solid rgba(255,255,255,0.07);padding:4px 8px;flex-wrap:wrap}
.tb-sep{width:1px;height:18px;background:rgba(255,255,255,0.10);margin:0 3px;flex-shrink:0}
.tb-btn{background:none;border:1px solid transparent;color:#9CA3AF;border-radius:4px;padding:3px 6px;cursor:pointer;font-size:13px;line-height:1.4;min-width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;transition:all 0.12s;white-space:nowrap}
.tb-btn:hover{background:rgba(255,255,255,0.07);color:#fff;border-color:rgba(255,255,255,0.12)}
.tb-btn.active{background:rgba(198,34,41,0.20);border-color:rgba(198,34,41,0.55);color:#C62229;font-weight:700}
.tb-btn svg{width:14px;height:14px;fill:currentColor;flex-shrink:0}
#block-select,#font-size-select{background:#141428;border:1px solid rgba(255,255,255,0.12);color:#D1D5DB;border-radius:5px;padding:3px 6px;font-size:12px;cursor:pointer;height:26px;outline:none}
#block-select{min-width:110px}#font-size-select{width:58px}
#editor{min-height:260px;padding:16px 18px;color:#D1D5DB;font-size:15px;line-height:1.7;outline:none;caret-color:#C62229}
#editor:empty:before{content:attr(data-placeholder);color:#4B5563;pointer-events:none}
#editor p{margin-bottom:6px}
#editor b,#editor strong{color:#fff;font-weight:700}
#editor h1{font-size:26px;font-weight:700;color:#fff;margin:10px 0 6px}
#editor h2{font-size:20px;font-weight:700;color:#fff;margin:8px 0 4px}
#editor h3{font-size:17px;font-weight:600;color:#E5E7EB;margin:6px 0 3px}
#editor blockquote{border-left:3px solid #C62229;padding:6px 12px;margin:8px 0;background:rgba(198,34,41,0.06);color:#9CA3AF;font-style:italic}
#editor a{color:#C62229;text-decoration:underline}
#editor img{max-width:100%;border-radius:8px;margin:6px 0;display:block}
#editor pre{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:8px;padding:12px 14px;font-family:monospace;font-size:13px;color:#D1D5DB;overflow-x:auto}
#editor table{border-collapse:collapse;width:100%;margin:8px 0}
#editor td,#editor th{border:1px solid rgba(255,255,255,0.15);padding:7px 10px;text-align:left}
#editor th{background:rgba(255,255,255,0.06);font-weight:600;color:#fff}
.dlg-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.70);z-index:300;align-items:center;justify-content:center}
.dlg-overlay.show{display:flex}
.dlg-box{background:#141428;border:1px solid rgba(198,34,41,0.35);border-radius:12px;padding:20px;width:320px;display:flex;flex-direction:column;gap:10px}
.dlg-title{font-size:15px;font-weight:700;color:#fff}
.dlg-label{font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px}
.dlg-input{background:#0f0f1e;border:1px solid rgba(255,255,255,0.12);border-radius:7px;padding:8px 11px;color:#fff;font-size:13px;outline:none;width:100%}
.dlg-input:focus{border-color:rgba(198,34,41,0.55)}
.dlg-row{display:flex;gap:8px}
.dlg-btn{flex:1;padding:9px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:600}
.dlg-cancel{background:rgba(255,255,255,0.07);color:#9CA3AF;border:1px solid rgba(255,255,255,0.12)}
.dlg-ok{background:#C62229;color:#fff}
</style>
</head>
<body>
<div id="menubar">
  <div class="menu-item"><button class="menu-btn" onclick="toggleMenu('m-edit')">Edit</button><div class="dropdown" id="m-edit"><div class="dd-item" onclick="fmt('undo')">&#8617; Undo</div><div class="dd-item" onclick="fmt('redo')">&#8618; Redo</div><hr><div class="dd-item" onclick="fmt('selectAll')">Select All</div></div></div>
  <div class="menu-item"><button class="menu-btn" onclick="toggleMenu('m-insert')">Insert</button><div class="dropdown" id="m-insert"><div class="dd-item" onclick="closeMenus();openLinkDlg()">&#128279; Link...</div><div class="dd-item" onclick="closeMenus();triggerImgPick()">&#128444; Image...</div><div class="dd-item" onclick="closeMenus();insertTable()">&#8862; Table (3x3)</div><div class="dd-item" onclick="closeMenus();insertHR()">&#8212; Horizontal Line</div></div></div>
  <div class="menu-item"><button class="menu-btn" onclick="toggleMenu('m-format')">Format</button><div class="dropdown" id="m-format"><div class="dd-item" onclick="closeMenus();fmt('bold')"><b>B</b> Bold</div><div class="dd-item" onclick="closeMenus();fmt('italic')"><i>I</i> Italic</div><div class="dd-item" onclick="closeMenus();fmt('underline')"><u>U</u> Underline</div><div class="dd-item" onclick="closeMenus();fmt('removeFormat')">&#10005; Clear Formatting</div></div></div>
  <div class="menu-item"><button class="menu-btn" onclick="toggleMenu('m-tools')">Tools</button><div class="dropdown" id="m-tools"><div class="dd-item" onclick="closeMenus();countWords()"># Word Count</div></div></div>
</div>
<div id="toolbar">
  <button class="tb-btn" onclick="fmt('undo')" title="Undo">&#8617;</button>
  <button class="tb-btn" onclick="fmt('redo')" title="Redo">&#8618;</button>
  <div class="tb-sep"></div>
  <select id="block-select" onchange="applyBlock(this.value)"><option value="p">Paragraph</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="h3">Heading 3</option><option value="blockquote">Blockquote</option><option value="pre">Preformatted</option></select>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-bold" onclick="fmt('bold')" title="Bold"><b>B</b></button>
  <button class="tb-btn" id="tb-italic" onclick="fmt('italic')" title="Italic"><i>I</i></button>
  <button class="tb-btn" id="tb-under" onclick="fmt('underline')" title="Underline"><u>U</u></button>
  <button class="tb-btn" id="tb-strike" onclick="fmt('strikeThrough')" title="Strike"><s>S</s></button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-al" onclick="fmt('justifyLeft')" title="Left">&#8678;</button>
  <button class="tb-btn" id="tb-ac" onclick="fmt('justifyCenter')" title="Center">&#8700;</button>
  <button class="tb-btn" id="tb-ar" onclick="fmt('justifyRight')" title="Right">&#8680;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-ul" onclick="fmt('insertUnorderedList')" title="Bullets">&#8226;</button>
  <button class="tb-btn" id="tb-ol" onclick="fmt('insertOrderedList')" title="Numbers">1.</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="openLinkDlg()" title="Link">&#128279;</button>
  <button class="tb-btn" onclick="triggerImgPick()" title="Image">&#128444;</button>
  <button class="tb-btn" onclick="fmt('removeFormat')" title="Clear">&#10005;</button>
</div>
<input id="img-file" type="file" accept="image/*" style="display:none" onchange="handleImgFile(this)">
<div id="editor" contenteditable="true" data-placeholder="Start writing your article..." spellcheck="true"></div>
<div class="dlg-overlay" id="link-dlg"><div class="dlg-box"><div class="dlg-title">Insert Link</div><div class="dlg-label">Display Text</div><input class="dlg-input" id="link-text" placeholder="e.g. Click here"><div class="dlg-label">URL</div><input class="dlg-input" id="link-url" placeholder="https://" type="url"><div class="dlg-row"><button class="dlg-btn dlg-cancel" onclick="closeDlg('link-dlg')">Cancel</button><button class="dlg-btn dlg-ok" onclick="confirmLink()">Insert</button></div></div></div>
<div class="dlg-overlay" id="wc-dlg"><div class="dlg-box"><div class="dlg-title">Word Count</div><p id="wc-result" style="color:#D1D5DB;font-size:13px"></p><div class="dlg-row"><button class="dlg-btn dlg-ok" onclick="closeDlg('wc-dlg')" style="flex:1">Close</button></div></div></div>
<script>
var ed=document.getElementById('editor'),savedRange=null;
function saveRange(){var s=window.getSelection();if(s&&s.rangeCount>0)savedRange=s.getRangeAt(0).cloneRange();}
function restoreRange(){if(!savedRange)return;var s=window.getSelection();if(s){s.removeAllRanges();s.addRange(savedRange);}}
function fmt(cmd){ed.focus();document.execCommand(cmd,false,null);notify();updateActive();}
function applyBlock(v){if(!v)return;ed.focus();document.execCommand('formatBlock',false,v);notify();}
function insertTable(){ed.focus();var h='<table>';for(var r=0;r<3;r++){h+='<tr>';for(var c=0;c<3;c++)h+=r===0?'<th>&nbsp;</th>':'<td>&nbsp;</td>';h+='</tr>';}h+='</table><p><br></p>';document.execCommand('insertHTML',false,h);notify();}
function insertHR(){ed.focus();document.execCommand('insertHTML',false,'<hr>');notify();}
function openLinkDlg(){saveRange();var s=window.getSelection();if(s&&s.toString())document.getElementById('link-text').value=s.toString();document.getElementById('link-dlg').classList.add('show');setTimeout(function(){document.getElementById('link-url').focus();},50);}
function closeDlg(id){document.getElementById(id).classList.remove('show');}
function confirmLink(){var t=document.getElementById('link-text').value.trim(),u=document.getElementById('link-url').value.trim();if(!u){closeDlg('link-dlg');return;}restoreRange();ed.focus();if(t)document.execCommand('insertHTML',false,'<a href="'+u+'">'+t+'</a>');else document.execCommand('createLink',false,u);closeDlg('link-dlg');document.getElementById('link-text').value='';document.getElementById('link-url').value='';notify();}
function toggleMenu(id){var open=document.getElementById(id).classList.contains('show');closeMenus();if(!open){document.getElementById(id).classList.add('show');document.getElementById(id).previousElementSibling.classList.add('open');}}
function closeMenus(){document.querySelectorAll('.dropdown.show').forEach(function(d){d.classList.remove('show');});document.querySelectorAll('.menu-btn.open').forEach(function(b){b.classList.remove('open');});}
document.addEventListener('click',function(e){if(!e.target.closest('.menu-item'))closeMenus();});
function countWords(){var t=ed.innerText||ed.textContent||'',w=t.trim().split(/\s+/).filter(function(x){return x.length>0;});document.getElementById('wc-result').innerHTML='Words: <strong>'+w.length+'</strong><br>Characters: <strong>'+t.length+'</strong>';document.getElementById('wc-dlg').classList.add('show');}
function triggerImgPick(){document.getElementById('img-file').click();}
function handleImgFile(input){var f=input.files[0];if(!f)return;var r=new FileReader();r.onload=function(e){if(window.parent)window.parent.postMessage({type:'insertImage',dataUrl:e.target.result,mimeType:f.type},'*');};r.readAsDataURL(f);input.value='';}
window.insertImageUrl=function(url){ed.focus();document.execCommand('insertHTML',false,'<img src="'+url+'" alt="image">');notify();};
function notify(){if(window.parent)window.parent.postMessage({type:'htmlChange',html:ed.innerHTML},'*');}
function updateActive(){[['tb-bold','bold'],['tb-italic','italic'],['tb-under','underline'],['tb-strike','strikeThrough'],['tb-al','justifyLeft'],['tb-ac','justifyCenter'],['tb-ar','justifyRight'],['tb-ul','insertUnorderedList'],['tb-ol','insertOrderedList']].forEach(function(p){var el=document.getElementById(p[0]);if(!el)return;try{if(document.queryCommandState(p[1]))el.classList.add('active');else el.classList.remove('active');}catch(ex){}});}
document.addEventListener('selectionchange',updateActive);
ed.addEventListener('input',notify);
</script>
</body>
</html>`;

// ─── WebRichEditor component ──────────────────────────────────────────────────
interface WebRichEditorProps {
  onHtmlChange: (html: string) => void;
  onInsertImageRequest: (dataUrl: string, mimeType: string) => void;
  iframeRef: React.RefObject<any>;
}

function WebRichEditor({ onHtmlChange, onInsertImageRequest, iframeRef }: WebRichEditorProps) {
  const handleMessage = useCallback(
    (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "htmlChange") onHtmlChange(e.data.html ?? "");
      else if (e.data.type === "insertImage") onInsertImageRequest(e.data.dataUrl ?? "", e.data.mimeType ?? "image/jpeg");
    },
    [onHtmlChange, onInsertImageRequest]
  );
  React.useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);
  return (
    <iframe
      ref={iframeRef}
      srcDoc={WEB_EDITOR_HTML}
      style={{ width: "100%", height: 460, border: "none", borderRadius: 8, background: "#0f0f1e" } as React.CSSProperties}
      sandbox="allow-scripts allow-same-origin"
      title="Article editor"
    />
  );
}

// ─── Native link modal ────────────────────────────────────────────────────────
function LinkModal({ visible, onClose, onConfirm }: { visible: boolean; onClose: () => void; onConfirm: (text: string, url: string) => void }) {
  const [linkText, setLinkText] = useState("");
  const [linkUrl,  setLinkUrl]  = useState("");
  const handleConfirm = useCallback(() => { onConfirm(linkText.trim(), linkUrl.trim()); setLinkText(""); setLinkUrl(""); }, [linkText, linkUrl, onConfirm]);
  const handleClose   = useCallback(() => { setLinkText(""); setLinkUrl(""); onClose(); }, [onClose]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={mStyles.overlay}>
        <View style={mStyles.box}>
          <Text style={mStyles.title}>Insert Link</Text>
          <Text style={mStyles.label}>Display Text</Text>
          <TextInput style={mStyles.input} placeholder="e.g. Click here" placeholderTextColor={Colors.textMuted} value={linkText} onChangeText={setLinkText} />
          <Text style={mStyles.label}>URL</Text>
          <TextInput style={mStyles.input} placeholder="https://" placeholderTextColor={Colors.textMuted} value={linkUrl} onChangeText={setLinkUrl} keyboardType="url" autoCapitalize="none" />
          <View style={mStyles.row}>
            <TouchableOpacity style={[mStyles.btn, mStyles.btnCancel]} onPress={handleClose}><Text style={mStyles.btnCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[mStyles.btn, mStyles.btnOk]} onPress={handleConfirm}><Text style={mStyles.btnOkText}>Insert Link</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.70)", alignItems: "center", justifyContent: "center", padding: 24 },
  box: { width: "100%", maxWidth: 360, backgroundColor: Colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.redBorder, padding: 20, gap: 10 },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: 7, padding: 10, color: Colors.textPrimary, fontSize: 13 },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  btn: { flex: 1, padding: 10, borderRadius: 7, alignItems: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: Colors.borderNeutral },
  btnOk: { backgroundColor: Colors.primary },
  btnCancelText: { color: Colors.textMuted, fontWeight: "600" },
  btnOkText: { color: Colors.textPrimary, fontWeight: "600" },
});

// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadImageBlob(uriOrDataUrl: string, mimeType: string, generateUploadUrl: () => Promise<string>): Promise<string | null> {
  try {
    const uploadUrl = await generateUploadUrl();
    const blob: Blob = await (async () => {
      if (uriOrDataUrl.startsWith("data:")) { const res = await fetch(uriOrDataUrl); return await res.blob(); }
      const res = await fetch(uriOrDataUrl); return await res.blob();
    })();
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mimeType }, body: blob });
    const { storageId } = await response.json();
    return storageId ?? null;
  } catch (err) { console.warn("uploadImageBlob error:", err); return null; }
}

// ─── Main composer — 3-step wizard ───────────────────────────────────────────
function WriteArticleContent() {
  const router  = useRouter();
  const history = useNavigationHistory();
  const insets       = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const bottomPad    = tabBarHeight + insets.bottom + spacing.space8;

  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);

  // ── Editor state ──────────────────────────────────────────────────────────
  const [title,    setTitle]    = useState("");
  const [richHtml, setRichHtml] = useState("");
  const [webHtml,  setWebHtml]  = useState("");

  // ── Cover image ───────────────────────────────────────────────────────────
  const [coverUri,  setCoverUri]  = useState<string | null>(null);
  const [coverMime, setCoverMime] = useState("image/jpeg");

  // ── Tags ──────────────────────────────────────────────────────────────────
  const [tagsRaw, setTagsRaw] = useState("");

  // ── Settings ──────────────────────────────────────────────────────────────
  const [isPublic,          setIsPublic]          = useState(true);
  const [isSensitive,       setIsSensitive]       = useState(false);
  const [isPremium,         setIsPremium]         = useState(false);
  const [priceAmount,       setPriceAmount]       = useState("");
  const [priceCurrency,     setPriceCurrency]     = useState<Currency>("USD");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const [submitting,       setSubmitting]       = useState(false);
  const [linkModalVisible, setLinkModalVisible] = useState(false);

  const createArticle    = useMutation(api.articles.createArticle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const walletData        = useQuery((api as any)["wallets/getWalletBalance"].getWalletBalance, {});
  const richEditorRef     = useRef<any>(null);
  const iframeRef         = useRef<any>(null);

  const walletSynced = useRef(false);
  React.useEffect(() => {
    if (!walletSynced.current && walletData?.primaryCurrency) {
      setPriceCurrency(walletData.primaryCurrency as Currency);
      walletSynced.current = true;
    }
  }, [walletData]);

  const tags        = tagsRaw.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
  const contentHtml = Platform.OS === "web" ? webHtml : richHtml;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleInsertImageRequest = useCallback(async (dataUrl: string, mime: string) => {
    const storageId = await uploadImageBlob(dataUrl, mime, () => generateUploadUrl({}));
    if (storageId && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.insertImageUrl(`https://your-convex-deployment.convex.cloud/api/storage/${storageId}`);
    }
  }, [generateUploadUrl]);

  const handlePickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (!result.canceled && result.assets.length > 0) { setCoverUri(result.assets[0].uri); setCoverMime(result.assets[0].mimeType ?? "image/jpeg"); }
  }, []);

  const handleNativeInsertImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const storageId = await uploadImageBlob(asset.uri, asset.mimeType ?? "image/jpeg", () => generateUploadUrl({}));
      if (storageId && richEditorRef.current) richEditorRef.current.insertImage(`https://your-convex-deployment.convex.cloud/api/storage/${storageId}`);
    }
  }, [generateUploadUrl]);

  const handleNativeLinkConfirm = useCallback((text: string, url: string) => {
    if (url && richEditorRef.current) richEditorRef.current.insertLink(text || url, url);
    setLinkModalVisible(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { Alert.alert("Missing Title", "Please add a title."); return; }
    if (!contentHtml.trim()) { Alert.alert("Missing Content", "Please write some content."); return; }
    if (!coverUri) { Alert.alert("Cover required", "Please upload a cover image."); return; }
    setSubmitting(true);
    try {
      let coverImage: string | undefined;
      const sid = await uploadImageBlob(coverUri, coverMime, () => generateUploadUrl({}));
      if (sid) coverImage = sid;
      await createArticle({
        title: title.trim(), contentHtml, tags, isSensitive, isPublic, isGated: isPremium,
        priceToken: isPremium ? priceCurrency : undefined,
        priceAmount: isPremium && priceAmount ? parseFloat(priceAmount) : undefined,
        coverImage,
      });
      Alert.alert("Submitted!", "Your article has been submitted for review.", [
        { text: "OK", onPress: () => history.goBack(router, "/(tabs)/learn") },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to submit article.");
    } finally {
      setSubmitting(false);
    }
  }, [title, contentHtml, tags, isSensitive, isPublic, isPremium, priceAmount, coverUri, coverMime, createArticle, generateUploadUrl, router]);

  // ── Wizard navigation ─────────────────────────────────────────────────────
  function handleNext() {
    if (step === 1) {
      if (!title.trim()) { Alert.alert("Missing Title", "Please add a title before continuing."); return; }
      if (!contentHtml.trim()) { Alert.alert("Missing Content", "Please write some content before continuing."); return; }
    }
    if (step === 2 && !coverUri) { Alert.alert("Cover required", "Please upload a cover image before continuing."); return; }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as any);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleBack() {
    if (step === 1) { history.goBack(router, "/(tabs)/learn"); return; }
    setStep((s) => Math.max(s - 1, 1) as any);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  return (
    <AppBackground style={styles.flex1}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <MobileCard style={styles.card} containerStyle={styles.cardContainer}>

          {/* ── Screen header ───────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={handleBack} style={styles.headerBtn} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={step === 1 ? "Cancel" : "Back"}>
              <Ionicons name="chevron-back" size={24} color={Colors.iconPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} allowFontScaling={false}>Write Article</Text>
            <View style={styles.headerBtn} />
          </View>

          <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]} keyboardShouldPersistTaps="handled">

            {/* ── Progress header ──────────────────────────────── */}
            <View style={styles.progressSection}>
              <View style={styles.progressLabels}>
                <Text style={styles.stepCounter} allowFontScaling={false}>Step {step} of {TOTAL_STEPS}</Text>
                <Text style={styles.stepName} allowFontScaling={false}>{STEP_LABELS[step - 1]}</Text>
              </View>
              <WizardProgressBar step={step} total={TOTAL_STEPS} />
            </View>

            {/* ── Step title ───────────────────────────────────── */}
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle} allowFontScaling={false}>{STEP_LABELS[step - 1]}</Text>
              <Text style={styles.stepSubtitle} allowFontScaling={false}>{STEP_SUBTITLES[step - 1]}</Text>
            </View>

            {/* ═══════════════════════════════════════════════
                STEP 1 — Content
            ═══════════════════════════════════════════════ */}
            {step === 1 && (
              <View style={styles.stepBody}>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Article title…"
                  placeholderTextColor={Colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  multiline
                  maxLength={200}
                  accessibilityLabel="Article title"
                />
                <View style={styles.editorCard}>
                  {Platform.OS === "web" ? (
                    <WebRichEditor iframeRef={iframeRef} onHtmlChange={setWebHtml} onInsertImageRequest={handleInsertImageRequest} />
                  ) : RichEditor && RichToolbar && richActions ? (
                    <>
                      <RichToolbar
                        editor={richEditorRef}
                        actions={[
                          richActions.setBold, richActions.setItalic, richActions.setUnderline,
                          richActions.heading1, richActions.heading2, richActions.setParagraph,
                          richActions.alignLeft, richActions.alignCenter, richActions.alignRight,
                          richActions.insertBulletsList, richActions.insertOrderedList,
                          richActions.blockquote, richActions.insertLink, richActions.insertImage,
                          richActions.setHR, richActions.removeFormat, richActions.undo, richActions.redo,
                        ]}
                        selectedIconTint={Colors.primary}
                        selectedButtonStyle={{ backgroundColor: Colors.redSurface, borderRadius: 6 }}
                        onPressAddImage={handleNativeInsertImage}
                        onInsertLink={() => setLinkModalVisible(true)}
                        style={{ backgroundColor: Colors.bgSurface, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault }}
                      />
                      <RichEditor
                        ref={richEditorRef}
                        onChange={setRichHtml}
                        placeholder="Start writing your article…"
                        initialContentHTML=""
                        editorStyle={{ backgroundColor: Colors.bgElevated, color: Colors.textSecondary, caretColor: Colors.primary, placeholderColor: Colors.textMuted, cssText: "font-size:15px;line-height:1.7;" }}
                        style={{ minHeight: 360 }}
                      />
                      <LinkModal visible={linkModalVisible} onClose={() => setLinkModalVisible(false)} onConfirm={handleNativeLinkConfirm} />
                    </>
                  ) : (
                    <View style={{ padding: 20, alignItems: "center" }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Rich editor not available. Install react-native-pell-rich-editor.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                STEP 2 — Details
            ═══════════════════════════════════════════════ */}
            {step === 2 && (
              <View style={styles.stepBody}>
                {/* Cover image */}
                <View>
                  <View style={styles.coverLabelRow}>
                    <Text style={styles.label}>Cover Image (16:9)</Text>
                    <Text style={styles.requiredBadge}>Required</Text>
                  </View>
                  <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Pick cover image">
                    {coverUri ? (
                      <>
                        <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                        <TouchableOpacity style={styles.coverRemoveBtn} onPress={(e) => { e.stopPropagation(); setCoverUri(null); }}>
                          <Ionicons name="close" size={16} color="#fff" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                        <Text style={styles.coverPickerText}>Tap to pick a cover image</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Tags */}
                <View>
                  <Text style={styles.label}>Tags (comma-separated)</Text>
                  <TextInput style={styles.tagInput} placeholder="e.g. fitness, wellness" placeholderTextColor={Colors.textMuted} value={tagsRaw} onChangeText={setTagsRaw} autoCapitalize="none" accessibilityLabel="Tags" />
                  {tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {tags.map((tag, i) => (
                        <View key={i} style={styles.chip}>
                          <Text style={styles.chipText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Visibility */}
                <View>
                  <Text style={styles.label}>Visibility</Text>
                  <View style={styles.visRow}>
                    <TouchableOpacity style={[styles.visTile, isPublic && styles.visTileActive]} onPress={() => setIsPublic(true)} activeOpacity={0.8} accessibilityRole="radio" accessibilityState={{ checked: isPublic }}>
                      <Ionicons name="globe-outline" size={20} color={isPublic ? Colors.primary : Colors.textMuted} />
                      <Text style={[styles.visTileLabel, isPublic && styles.visTileLabelActive]}>Public</Text>
                      <Text style={styles.visTileDesc}>Visible to everyone</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.visTile, !isPublic && styles.visTileActive]} onPress={() => setIsPublic(false)} activeOpacity={0.8} accessibilityRole="radio" accessibilityState={{ checked: !isPublic }}>
                      <Ionicons name="school-outline" size={20} color={!isPublic ? Colors.primary : Colors.textMuted} />
                      <Text style={[styles.visTileLabel, !isPublic && styles.visTileLabelActive]}>Course-only</Text>
                      <Text style={styles.visTileDesc}>Only course members</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* ═══════════════════════════════════════════════
                STEP 3 — Settings
            ═══════════════════════════════════════════════ */}
            {step === 3 && (
              <View style={styles.stepBody}>
                {/* Sensitive toggle */}
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.toggleLabel}>Sensitive Content</Text>
                    <Text style={styles.toggleDesc}>Requires age confirmation</Text>
                  </View>
                  <Switch value={isSensitive} onValueChange={setIsSensitive} trackColor={{ false: Colors.borderNeutral, true: Colors.primary }} thumbColor={Colors.textPrimary} accessibilityLabel="Sensitive content" />
                </View>

                {/* Premium toggle */}
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={styles.toggleLabel}>Premium Article</Text>
                    <Text style={styles.toggleDesc}>Readers pay tokens to unlock</Text>
                  </View>
                  <Switch value={isPremium} onValueChange={setIsPremium} trackColor={{ false: Colors.borderNeutral, true: Colors.primary }} thumbColor={Colors.textPrimary} accessibilityLabel="Premium article" />
                </View>

                {isPremium && (
                  <View style={styles.priceRow}>
                    <TextInput
                      style={[styles.priceInput, styles.priceAmountInput]}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textMuted}
                      value={priceAmount}
                      onChangeText={setPriceAmount}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Price"
                    />
                    <TouchableOpacity style={styles.priceCurrencyBtn} onPress={() => setCurrencyPickerOpen(true)} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Currency: ${priceCurrency}`}>
                      <Text style={styles.priceCurrencyBtnText} allowFontScaling={false}>{CURRENCY_SYMBOLS[priceCurrency]} {priceCurrency}</Text>
                      <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Currency picker modal */}
                <Modal visible={currencyPickerOpen} transparent animationType="slide" onRequestClose={() => setCurrencyPickerOpen(false)}>
                  <View style={styles.cpOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setCurrencyPickerOpen(false)} accessibilityLabel="Close currency picker" />
                    <View style={styles.cpSheet}>
                      <View style={styles.cpHeader}>
                        <Text style={styles.cpTitle} allowFontScaling={false}>Pricing Currency</Text>
                        <TouchableOpacity onPress={() => setCurrencyPickerOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close" size={22} color={Colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                      <FlatList
                        data={CURRENCIES as unknown as Currency[]}
                        keyExtractor={(c) => c}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        renderItem={({ item }) => {
                          const active = item === priceCurrency;
                          return (
                            <TouchableOpacity style={[styles.cpOption, active && styles.cpOptionActive]} onPress={() => { setPriceCurrency(item); setCurrencyPickerOpen(false); }} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: active }}>
                              <Text style={[styles.cpOptionText, active && styles.cpOptionTextActive]} allowFontScaling={false}>{CURRENCY_SYMBOLS[item]}  {item}</Text>
                              <Text style={styles.cpOptionSub} allowFontScaling={false}>{CURRENCY_LABELS[item]}</Text>
                              {active && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                            </TouchableOpacity>
                          );
                        }}
                      />
                    </View>
                  </View>
                </Modal>

                {/* Approval notice */}
                <View style={styles.noticeBox}>
                  <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.noticeText}>Articles are reviewed by our team before being published. You will receive a notification once your article is approved or if changes are needed.</Text>
                </View>
              </View>
            )}

            {/* ── Nav buttons ──────────────────────────────────── */}
            <View style={styles.navRow}>
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={submitting} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={step === 1 ? "Cancel" : "Back"}>
                <Ionicons name="chevron-back" size={18} color={TokenColors.textSecondary} />
                <Text style={styles.backBtnText} allowFontScaling={false}>{step === 1 ? "Cancel" : "Back"}</Text>
              </TouchableOpacity>

              {step < TOTAL_STEPS ? (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Next">
                  <Text style={styles.nextBtnText} allowFontScaling={false}>Next</Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.nextBtn, submitting && styles.nextBtnDisabled]} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Submit for Review">
                  {submitting ? (
                    <><ActivityIndicator color="#fff" size="small" /><Text style={styles.nextBtnText} allowFontScaling={false}>Submitting…</Text></>
                  ) : (
                    <><Ionicons name="send-outline" size={18} color="#fff" /><Text style={styles.nextBtnText} allowFontScaling={false}>Submit for Review</Text></>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </MobileCard>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

// ─── Auth guard wrapper ───────────────────────────────────────────────────────
export default function WriteArticleScreen() {
  return (
    <>
      <AuthLoading><AppLoader /></AuthLoading>
      <Unauthenticated><Redirect href="/SignIn" /></Unauthenticated>
      <Authenticated><WriteArticleContent /></Authenticated>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1:         { flex: 1 },
  cardContainer: { flex: 1, paddingTop: 0, paddingBottom: 0 },
  card:          { flex: 1, padding: 0 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.space4, paddingBottom: spacing.space3,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  headerBtn:   { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: spacing.space4, gap: spacing.space4 },

  // Progress
  progressSection: { marginBottom: spacing.space2 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.space2 },
  stepCounter: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  stepName:    { fontSize: 12, color: Colors.textMuted },

  // Step header
  stepHeader:   { marginBottom: spacing.space2, gap: spacing.space1 },
  stepTitle:    { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  stepSubtitle: { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },

  // Step body
  stepBody: { gap: spacing.space4 },

  // Title input
  titleInput: {
    fontSize: 22, fontWeight: "700", color: Colors.textPrimary,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderDefault,
    padding: 14,
  },

  // Editor wrapper
  editorCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.borderDefault,
    overflow: "hidden", minHeight: 460,
  },

  // Cover image
  coverLabelRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 6 },
  requiredBadge: { fontSize: 10, fontWeight: "700" as const, color: Colors.primary },
  coverPicker: {
    height: 180, borderRadius: 10, borderWidth: 1.5, borderStyle: "dashed",
    borderColor: Colors.borderNeutral,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bgElevated, overflow: "hidden",
  },
  coverPreview:    { width: "100%", height: "100%", resizeMode: "cover" },
  coverPickerText: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },
  coverRemoveBtn: {
    position: "absolute", top: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 14,
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
  },

  // Tags
  label: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  tagInput: {
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: 14, marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: { backgroundColor: Colors.redSurface, borderWidth: 1, borderColor: Colors.redBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  chipText: { color: Colors.primary, fontSize: 12 },

  // Visibility tiles
  visRow: { flexDirection: "row", gap: 10 },
  visTile: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.borderDefault, backgroundColor: Colors.bgElevated, alignItems: "center", gap: 4 },
  visTileActive: { borderColor: Colors.primary, backgroundColor: Colors.redSurface },
  visTileLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  visTileLabelActive: { color: Colors.primary },
  visTileDesc: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },

  // Toggles
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderDefault },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  toggleDesc:  { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Price row
  priceRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  priceInput: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: 14 },
  priceAmountInput: { flex: 1, marginBottom: 0 },
  priceCurrencyBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, minWidth: 90 },
  priceCurrencyBtnText: { fontSize: 14, color: Colors.textPrimary, fontWeight: "600" },

  // Currency picker
  cpOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  cpSheet: { backgroundColor: "#141428", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, maxHeight: "55%" },
  cpHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cpTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  cpOption: { height: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingHorizontal: 4 },
  cpOptionActive: { backgroundColor: "rgba(198,34,41,0.10)" },
  cpOptionText: { fontSize: 14, color: "#D1D5DB", minWidth: 52, fontWeight: "600" },
  cpOptionTextActive: { color: Colors.primary },
  cpOptionSub: { fontSize: 12, color: "#6B7280", flex: 1 },

  // Approval notice
  noticeBox: { backgroundColor: Colors.redSurface, borderWidth: 1, borderColor: Colors.redBorder, borderRadius: 10, padding: 12, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  // Nav buttons — matches StandaloneReferralCreationForm pattern
  navRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space4 },
  backBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    height: 50, borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  backBtnText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  nextBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    height: 50, borderRadius: radius.radiusMD, backgroundColor: Colors.primary,
  },
  nextBtnDisabled: { opacity: 0.7 },
  nextBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
