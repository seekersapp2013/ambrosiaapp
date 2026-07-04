/**
 * Write Article Screen — Route: /(tabs)/write-article
 *
 * Editor layout mirrors TinyMCE:
 *   1. Menu bar  — Edit | Insert | Format | Table | Tools  (dropdown menus)
 *   2. Toolbar   — Undo/Redo | Block format | Font size | B I U S x₂ x² | Color | Align | Lists | Insert | Clear
 *   3. Editor    — contenteditable div
 *
 * Platform strategy:
 *   Web    → <iframe srcDoc> — full menu bar + toolbar, execCommand, active state sync
 *   Native → react-native-pell-rich-editor, RichToolbar
 *
 * Design system: Colors imported from @/constants/Colors
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
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS } from "@/utils/currency";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

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
// The ENTIRE HTML document is a single template literal string.
// Backticks inside are escaped as \`.
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
#block-select{background:#141428;border:1px solid rgba(255,255,255,0.12);color:#D1D5DB;border-radius:5px;padding:3px 6px;font-size:12px;cursor:pointer;height:26px;outline:none;min-width:110px}
#block-select:focus{border-color:rgba(198,34,41,0.55)}
#font-size-select{background:#141428;border:1px solid rgba(255,255,255,0.12);color:#D1D5DB;border-radius:5px;padding:3px 5px;font-size:12px;cursor:pointer;height:26px;outline:none;width:58px}
#font-size-select:focus{border-color:rgba(198,34,41,0.55)}
.color-wrap{position:relative;display:inline-flex;flex-direction:column;align-items:center}
.color-bar{height:3px;border-radius:1px;width:14px;margin-top:1px;pointer-events:none}
</style>
<style>
#editor{min-height:260px;padding:16px 18px;color:#D1D5DB;font-size:15px;line-height:1.7;outline:none;caret-color:#C62229}
#editor:empty:before{content:attr(data-placeholder);color:#4B5563;pointer-events:none}
#editor p{margin-bottom:6px}
#editor b,#editor strong{color:#fff;font-weight:700}
#editor i,#editor em{color:#E5E7EB}
#editor u{text-decoration-color:rgba(198,34,41,0.7)}
#editor h1{font-size:26px;font-weight:700;color:#fff;margin:10px 0 6px;line-height:1.3}
#editor h2{font-size:20px;font-weight:700;color:#fff;margin:8px 0 4px}
#editor h3{font-size:17px;font-weight:600;color:#E5E7EB;margin:6px 0 3px}
#editor h4{font-size:15px;font-weight:600;color:#D1D5DB;margin:4px 0}
#editor ul,#editor ol{padding-left:24px;margin:4px 0}
#editor li{margin-bottom:4px}
#editor blockquote{border-left:3px solid #C62229;padding:6px 12px;margin:8px 0;background:rgba(198,34,41,0.06);border-radius:0 6px 6px 0;color:#9CA3AF;font-style:italic}
#editor a{color:#C62229;text-decoration:underline;text-decoration-color:rgba(198,34,41,0.5)}
#editor hr{border:none;border-top:1px solid rgba(255,255,255,0.12);margin:12px 0}
#editor img{max-width:100%;border-radius:8px;margin:6px 0;display:block}
#editor pre{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.10);border-radius:8px;padding:12px 14px;font-family:monospace;font-size:13px;color:#D1D5DB;overflow-x:auto;margin:6px 0}
#editor code{background:rgba(255,255,255,0.07);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:13px;color:#E5E7EB}
#editor table{border-collapse:collapse;width:100%;margin:8px 0}
#editor td,#editor th{border:1px solid rgba(255,255,255,0.15);padding:7px 10px;text-align:left}
#editor th{background:rgba(255,255,255,0.06);font-weight:600;color:#fff}
#editor sub{font-size:0.75em;vertical-align:sub}
#editor sup{font-size:0.75em;vertical-align:super}
#editor mark{background:rgba(245,158,11,0.30);color:#fff;border-radius:2px;padding:0 2px}
.dlg-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.70);z-index:300;align-items:center;justify-content:center}
.dlg-overlay.show{display:flex}
.dlg-box{background:#141428;border:1px solid rgba(198,34,41,0.35);border-radius:12px;padding:20px;width:320px;display:flex;flex-direction:column;gap:10px;box-shadow:0 12px 32px rgba(0,0,0,0.6)}
.dlg-title{font-size:15px;font-weight:700;color:#fff;margin-bottom:2px}
.dlg-label{font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px}
.dlg-input{background:#0f0f1e;border:1px solid rgba(255,255,255,0.12);border-radius:7px;padding:8px 11px;color:#fff;font-size:13px;outline:none;width:100%}
.dlg-input:focus{border-color:rgba(198,34,41,0.55)}
.dlg-row{display:flex;gap:8px}
.dlg-btn{flex:1;padding:9px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:opacity 0.1s}
.dlg-cancel{background:rgba(255,255,255,0.07);color:#9CA3AF;border:1px solid rgba(255,255,255,0.12)}
.dlg-ok{background:#C62229;color:#fff}
.dlg-btn:hover{opacity:0.85}
</style>
</head>
<body>

<div id="menubar">
  <div class="menu-item">
    <button class="menu-btn" onclick="toggleMenu('m-edit')">Edit</button>
    <div class="dropdown" id="m-edit">
      <div class="dd-item" onclick="fmt('undo')"><span class="icon">&#8617;</span>Undo<span class="shortcut">Ctrl+Z</span></div>
      <div class="dd-item" onclick="fmt('redo')"><span class="icon">&#8618;</span>Redo<span class="shortcut">Ctrl+Y</span></div>
      <hr>
      <div class="dd-item" onclick="fmt('cut')"><span class="icon">&#9986;</span>Cut<span class="shortcut">Ctrl+X</span></div>
      <div class="dd-item" onclick="fmt('copy')"><span class="icon">&#9192;</span>Copy<span class="shortcut">Ctrl+C</span></div>
      <div class="dd-item" onclick="fmt('paste')"><span class="icon">&#128203;</span>Paste<span class="shortcut">Ctrl+V</span></div>
      <hr>
      <div class="dd-item" onclick="fmt('selectAll')"><span class="icon">&#8862;</span>Select All<span class="shortcut">Ctrl+A</span></div>
    </div>
  </div>
  <div class="menu-item">
    <button class="menu-btn" onclick="toggleMenu('m-insert')">Insert</button>
    <div class="dropdown" id="m-insert">
      <div class="dd-item" onclick="closeMenus();openLinkDlg()"><span class="icon">&#128279;</span>Link...</div>
      <div class="dd-item" onclick="closeMenus();triggerImgPick()"><span class="icon">&#128444;</span>Image...</div>
      <div class="dd-item" onclick="closeMenus();insertTable()"><span class="icon">&#8862;</span>Table (3x3)</div>
      <div class="dd-item" onclick="closeMenus();insertHR()"><span class="icon">&#8212;</span>Horizontal Line</div>
      <hr>
      <div class="dd-item" onclick="closeMenus();insertSpecialChar('&copy;')"><span class="icon">&copy;</span>Copyright</div>
      <div class="dd-item" onclick="closeMenus();insertSpecialChar('&trade;')"><span class="icon">&trade;</span>Trademark</div>
    </div>
  </div>
  <div class="menu-item">
    <button class="menu-btn" onclick="toggleMenu('m-format')">Format</button>
    <div class="dropdown" id="m-format">
      <div class="dd-item" onclick="closeMenus();fmt('bold')"><span class="icon"><b>B</b></span>Bold<span class="shortcut">Ctrl+B</span></div>
      <div class="dd-item" onclick="closeMenus();fmt('italic')"><span class="icon"><i>I</i></span>Italic<span class="shortcut">Ctrl+I</span></div>
      <div class="dd-item" onclick="closeMenus();fmt('underline')"><span class="icon"><u>U</u></span>Underline<span class="shortcut">Ctrl+U</span></div>
      <div class="dd-item" onclick="closeMenus();fmt('strikeThrough')"><span class="icon"><s>S</s></span>Strikethrough</div>
      <div class="dd-item" onclick="closeMenus();fmt('subscript')"><span class="icon">x&#8322;</span>Subscript</div>
      <div class="dd-item" onclick="closeMenus();fmt('superscript')"><span class="icon">x&#178;</span>Superscript</div>
      <hr>
      <div class="dd-item" onclick="closeMenus();fmt('removeFormat')"><span class="icon">&#10005;</span>Clear Formatting</div>
    </div>
  </div>
  <div class="menu-item">
    <button class="menu-btn" onclick="toggleMenu('m-table')">Table</button>
    <div class="dropdown" id="m-table">
      <div class="dd-item" onclick="closeMenus();insertTable()"><span class="icon">&#8862;</span>Insert Table (3x3)</div>
      <div class="dd-item" onclick="closeMenus();tableCmd('insertRow')"><span class="icon">+</span>Add Row Below</div>
      <div class="dd-item" onclick="closeMenus();tableCmd('insertColumn')"><span class="icon">+</span>Add Column Right</div>
      <hr>
      <div class="dd-item" onclick="closeMenus();tableCmd('deleteRow')"><span class="icon">&#8722;</span>Delete Row</div>
      <div class="dd-item" onclick="closeMenus();tableCmd('deleteColumn')"><span class="icon">&#8722;</span>Delete Column</div>
    </div>
  </div>
  <div class="menu-item">
    <button class="menu-btn" onclick="toggleMenu('m-tools')">Tools</button>
    <div class="dropdown" id="m-tools">
      <div class="dd-item" onclick="closeMenus();countWords()"><span class="icon">#</span>Word Count</div>
      <div class="dd-item" onclick="closeMenus();fmt('selectAll');fmt('copy')"><span class="icon">&#9192;</span>Copy All</div>
    </div>
  </div>
</div>

<div id="toolbar">
  <button class="tb-btn" onclick="fmt('undo')" title="Undo">
    <svg viewBox="0 0 16 16"><path d="M3.4 7H9a4 4 0 1 1 0 8H5v-2h4a2 2 0 1 0 0-4H3.4l1.3 1.3-1.4 1.4L.1 8.7a1 1 0 0 1 0-1.4L3.3 4l1.4 1.4L3.4 7z"/></svg>
  </button>
  <button class="tb-btn" onclick="fmt('redo')" title="Redo">
    <svg viewBox="0 0 16 16"><path d="M12.6 7H7a4 4 0 1 0 0 8h4v-2H7a2 2 0 1 1 0-4h5.6l-1.3 1.3 1.4 1.4 3.2-3.3a1 1 0 0 0 0-1.4L12.7 4l-1.4 1.4L12.6 7z"/></svg>
  </button>
  <div class="tb-sep"></div>
  <select id="block-select" onchange="applyBlock(this.value)" title="Block format">
    <option value="p">Paragraph</option>
    <option value="h1">Heading 1</option>
    <option value="h2">Heading 2</option>
    <option value="h3">Heading 3</option>
    <option value="h4">Heading 4</option>
    <option value="pre">Preformatted</option>
    <option value="blockquote">Blockquote</option>
  </select>
  <select id="font-size-select" onchange="applyFontSize(this.value)" title="Font size">
    <option value="">Size</option>
    <option value="1">8px</option>
    <option value="2">10px</option>
    <option value="3">12px</option>
    <option value="4">14px</option>
    <option value="5">18px</option>
    <option value="6">24px</option>
    <option value="7">36px</option>
  </select>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-bold" onclick="fmt('bold')" title="Bold"><b>B</b></button>
  <button class="tb-btn" id="tb-italic" onclick="fmt('italic')" title="Italic"><i>I</i></button>
  <button class="tb-btn" id="tb-under" onclick="fmt('underline')" title="Underline"><u>U</u></button>
  <button class="tb-btn" id="tb-strike" onclick="fmt('strikeThrough')" title="Strikethrough"><s>S</s></button>
  <button class="tb-btn" id="tb-sub" onclick="fmt('subscript')" title="Subscript" style="font-size:10px">x&#8322;</button>
  <button class="tb-btn" id="tb-sup" onclick="fmt('superscript')" title="Superscript" style="font-size:10px">x&#178;</button>
  <div class="color-wrap" title="Text color">
    <button class="tb-btn" onclick="document.getElementById('fg-color').click()" style="position:relative;padding-bottom:6px">
      <b style="font-size:13px">A</b>
      <div class="color-bar" id="fg-bar" style="background:#C62229;position:absolute;bottom:3px;left:50%;transform:translateX(-50%)"></div>
    </button>
    <input type="color" id="fg-color" value="#C62229" style="opacity:0;position:absolute;width:0;height:0" onchange="applyForeColor(this.value)">
  </div>
  <div class="color-wrap" title="Highlight">
    <button class="tb-btn" onclick="document.getElementById('hl-color').click()" style="position:relative;padding-bottom:6px">
      <span style="font-size:11px">H</span>
      <div class="color-bar" id="hl-bar" style="background:#F59E0B;position:absolute;bottom:3px;left:50%;transform:translateX(-50%)"></div>
    </button>
    <input type="color" id="hl-color" value="#F59E0B" style="opacity:0;position:absolute;width:0;height:0" onchange="applyHilite(this.value)">
  </div>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-al" onclick="fmt('justifyLeft')" title="Align Left">
    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="6" width="9" height="2"/><rect x="1" y="10" width="14" height="2"/><rect x="1" y="14" width="9" height="2"/></svg>
  </button>
  <button class="tb-btn" id="tb-ac" onclick="fmt('justifyCenter')" title="Align Center">
    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2"/><rect x="3" y="6" width="10" height="2"/><rect x="1" y="10" width="14" height="2"/><rect x="3" y="14" width="10" height="2"/></svg>
  </button>
  <button class="tb-btn" id="tb-ar" onclick="fmt('justifyRight')" title="Align Right">
    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2"/><rect x="6" y="6" width="9" height="2"/><rect x="1" y="10" width="14" height="2"/><rect x="6" y="14" width="9" height="2"/></svg>
  </button>
  <button class="tb-btn" id="tb-aj" onclick="fmt('justifyFull')" title="Justify">
    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2"/><rect x="1" y="6" width="14" height="2"/><rect x="1" y="10" width="14" height="2"/><rect x="1" y="14" width="14" height="2"/></svg>
  </button>
  <div class="tb-sep"></div>
  <button class="tb-btn" id="tb-ul" onclick="fmt('insertUnorderedList')" title="Bullet List">
    <svg viewBox="0 0 16 16"><circle cx="2" cy="4" r="1.5"/><rect x="5" y="3" width="10" height="2"/><circle cx="2" cy="9" r="1.5"/><rect x="5" y="8" width="10" height="2"/><circle cx="2" cy="14" r="1.5"/><rect x="5" y="13" width="10" height="2"/></svg>
  </button>
  <button class="tb-btn" id="tb-ol" onclick="fmt('insertOrderedList')" title="Numbered List">
    <svg viewBox="0 0 16 16"><text x="0" y="6" font-size="6" fill="currentColor">1.</text><rect x="5" y="3" width="10" height="2"/><text x="0" y="11" font-size="6" fill="currentColor">2.</text><rect x="5" y="8" width="10" height="2"/></svg>
  </button>
  <button class="tb-btn" onclick="fmt('outdent')" title="Outdent">
    <svg viewBox="0 0 16 16"><path d="M6 4l-4 4 4 4V4z"/><rect x="7" y="3" width="8" height="2"/><rect x="7" y="7" width="8" height="2"/><rect x="7" y="11" width="8" height="2"/></svg>
  </button>
  <button class="tb-btn" onclick="fmt('indent')" title="Indent">
    <svg viewBox="0 0 16 16"><path d="M10 4l4 4-4 4V4z"/><rect x="1" y="3" width="8" height="2"/><rect x="1" y="7" width="8" height="2"/><rect x="1" y="11" width="8" height="2"/></svg>
  </button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="openLinkDlg()" title="Insert Link">
    <svg viewBox="0 0 16 16"><path d="M6.9 9.1a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1 1.4 1.4 1-1a1 1 0 0 1 1.4 1.4l-2 2a1 1 0 0 1-1.4 0L7 6.3 5.6 7.7l1.3 1.4z"/><path d="M9.1 6.9a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1L6.7 10.7l-1 1a1 1 0 0 1-1.4-1.4l2-2a1 1 0 0 1 1.4 0L9 9.7l1.4-1.4L9.1 6.9z"/></svg>
  </button>
  <button class="tb-btn" onclick="triggerImgPick()" title="Insert Image">
    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M1 11l4-4 3 3 2-2 4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
  </button>
  <button class="tb-btn" onclick="insertTable()" title="Insert Table">
    <svg viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1"/><line x1="1" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1"/><line x1="6" y1="1" x2="6" y2="15" stroke="currentColor" stroke-width="1"/><line x1="11" y1="1" x2="11" y2="15" stroke="currentColor" stroke-width="1"/></svg>
  </button>
  <button class="tb-btn" onclick="insertHR()" title="Horizontal Rule">&#8212;</button>
  <div class="tb-sep"></div>
  <button class="tb-btn" onclick="fmt('removeFormat')" title="Clear Formatting">
    <svg viewBox="0 0 16 16"><path d="M3 13l2-5L8.5 2H14l-3 5H8L6 13H3z" opacity="0.6"/><line x1="2" y1="14" x2="8" y2="14" stroke="currentColor" stroke-width="2"/></svg>
  </button>
</div>

<input id="img-file" type="file" accept="image/*" style="display:none" onchange="handleImgFile(this)">

<div id="editor" contenteditable="true" data-placeholder="Start writing your article..." spellcheck="true" onkeydown="handleKey(event)"></div>

<div class="dlg-overlay" id="link-dlg">
  <div class="dlg-box">
    <div class="dlg-title">Insert Link</div>
    <div class="dlg-label">Display Text</div>
    <input class="dlg-input" id="link-text" placeholder="e.g. Click here">
    <div class="dlg-label">URL</div>
    <input class="dlg-input" id="link-url" placeholder="https://" type="url">
    <div class="dlg-row">
      <button class="dlg-btn dlg-cancel" onclick="closeDlg('link-dlg')">Cancel</button>
      <button class="dlg-btn dlg-ok" onclick="confirmLink()">Insert Link</button>
    </div>
  </div>
</div>

<div class="dlg-overlay" id="wc-dlg">
  <div class="dlg-box">
    <div class="dlg-title">Word Count</div>
    <p id="wc-result" style="color:#D1D5DB;font-size:13px;line-height:1.6"></p>
    <div class="dlg-row">
      <button class="dlg-btn dlg-ok" onclick="closeDlg('wc-dlg')" style="flex:1">Close</button>
    </div>
  </div>
</div>

<script>
var ed = document.getElementById('editor');
var savedRange = null;

function saveRange() {
  var sel = window.getSelection();
  if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
}

function restoreRange() {
  if (!savedRange) return;
  var sel = window.getSelection();
  if (sel) { sel.removeAllRanges(); sel.addRange(savedRange); }
}

function fmt(cmd) {
  ed.focus();
  document.execCommand(cmd, false, null);
  notifyChange();
  updateActive();
}

function blk(tag) {
  ed.focus();
  document.execCommand('formatBlock', false, tag);
  notifyChange();
}

function applyBlock(v) {
  if (!v) return;
  ed.focus();
  document.execCommand('formatBlock', false, v);
  notifyChange();
}

function applyFontSize(v) {
  if (!v) return;
  ed.focus();
  document.execCommand('fontSize', false, v);
  notifyChange();
}

function applyForeColor(hex) {
  document.getElementById('fg-bar').style.background = hex;
  ed.focus();
  document.execCommand('foreColor', false, hex);
  notifyChange();
}

function applyHilite(hex) {
  document.getElementById('hl-bar').style.background = hex;
  ed.focus();
  document.execCommand('hiliteColor', false, hex);
  notifyChange();
}

function insertTable() {
  closeMenus();
  ed.focus();
  var rows = 3, cols = 3;
  var html = '<table>';
  for (var r = 0; r < rows; r++) {
    html += '<tr>';
    for (var c = 0; c < cols; c++) {
      html += r === 0 ? '<th>&nbsp;</th>' : '<td>&nbsp;</td>';
    }
    html += '</tr>';
  }
  html += '</table><p><br></p>';
  document.execCommand('insertHTML', false, html);
  notifyChange();
}

function tableCmd(cmd) {
  var sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  var node = sel.getRangeAt(0).commonAncestorContainer;
  while (node && node !== ed) {
    if (node.tagName === 'TR') {
      if (cmd === 'insertRow') {
        var newRow = node.cloneNode(true);
        newRow.querySelectorAll('th,td').forEach(function(c) { c.innerHTML = '&nbsp;'; });
        node.parentNode.insertBefore(newRow, node.nextSibling);
      } else if (cmd === 'deleteRow') {
        node.parentNode.removeChild(node);
      }
      notifyChange(); return;
    }
    if (node.tagName === 'TD' || node.tagName === 'TH') {
      var cell = node;
      var row = cell.parentNode;
      var table = row.closest('table');
      var idx = Array.from(row.children).indexOf(cell);
      if (cmd === 'insertColumn') {
        table.querySelectorAll('tr').forEach(function(tr) {
          var nc = tr.children[idx] ? tr.children[idx].cloneNode(false) : document.createElement('td');
          nc.innerHTML = '&nbsp;';
          tr.insertBefore(nc, tr.children[idx + 1] || null);
        });
      } else if (cmd === 'deleteColumn') {
        table.querySelectorAll('tr').forEach(function(tr) {
          if (tr.children[idx]) tr.removeChild(tr.children[idx]);
        });
      }
      notifyChange(); return;
    }
    node = node.parentNode;
  }
}

function insertHR() {
  closeMenus();
  ed.focus();
  document.execCommand('insertHTML', false, '<hr>');
  notifyChange();
}

function insertSpecialChar(ch) {
  ed.focus();
  document.execCommand('insertHTML', false, ch);
  notifyChange();
}

function openLinkDlg() {
  saveRange();
  var sel = window.getSelection();
  if (sel && sel.toString()) {
    document.getElementById('link-text').value = sel.toString();
  }
  document.getElementById('link-dlg').classList.add('show');
  setTimeout(function() { document.getElementById('link-url').focus(); }, 50);
}

function closeDlg(id) {
  document.getElementById(id).classList.remove('show');
}

function confirmLink() {
  var text = document.getElementById('link-text').value.trim();
  var url = document.getElementById('link-url').value.trim();
  if (!url) { closeDlg('link-dlg'); return; }
  restoreRange();
  ed.focus();
  if (text) {
    document.execCommand('insertHTML', false, '<a href="' + url + '">' + text + '</a>');
  } else {
    document.execCommand('createLink', false, url);
  }
  closeDlg('link-dlg');
  document.getElementById('link-text').value = '';
  document.getElementById('link-url').value = '';
  notifyChange();
}

function toggleMenu(id) {
  var isOpen = document.getElementById(id).classList.contains('show');
  closeMenus();
  if (!isOpen) {
    document.getElementById(id).classList.add('show');
    var btn = document.getElementById(id).previousElementSibling;
    if (btn) btn.classList.add('open');
  }
}

function closeMenus() {
  document.querySelectorAll('.dropdown.show').forEach(function(d) { d.classList.remove('show'); });
  document.querySelectorAll('.menu-btn.open').forEach(function(b) { b.classList.remove('open'); });
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.menu-item')) closeMenus();
});

function countWords() {
  var text = ed.innerText || ed.textContent || '';
  var words = text.trim().split(/\s+/).filter(function(w) { return w.length > 0; });
  var chars = text.length;
  var charsNoSpace = text.replace(/\s/g, '').length;
  document.getElementById('wc-result').innerHTML =
    'Words: <strong>' + words.length + '</strong><br>' +
    'Characters: <strong>' + chars + '</strong><br>' +
    'Characters (no spaces): <strong>' + charsNoSpace + '</strong>';
  document.getElementById('wc-dlg').classList.add('show');
}

function triggerImgPick() {
  document.getElementById('img-file').click();
}

function handleImgFile(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var mimeType = file.type;
    if (window.parent) {
      window.parent.postMessage({ type: 'insertImage', dataUrl: dataUrl, mimeType: mimeType }, '*');
    }
  };
  reader.readAsDataURL(file);
  input.value = '';
}

window.insertImageUrl = function(url) {
  ed.focus();
  document.execCommand('insertHTML', false, '<img src="' + url + '" alt="image">');
  notifyChange();
};

function handleKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
}

function notifyChange() {
  if (window.parent) {
    window.parent.postMessage({ type: 'htmlChange', html: ed.innerHTML }, '*');
  }
}

function updateActive() {
  var cmds = [
    ['tb-bold','bold'],['tb-italic','italic'],['tb-under','underline'],
    ['tb-strike','strikeThrough'],['tb-sub','subscript'],['tb-sup','superscript'],
    ['tb-al','justifyLeft'],['tb-ac','justifyCenter'],['tb-ar','justifyRight'],['tb-aj','justifyFull'],
    ['tb-ul','insertUnorderedList'],['tb-ol','insertOrderedList'],
  ];
  cmds.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (!el) return;
    try {
      if (document.queryCommandState(pair[1])) { el.classList.add('active'); }
      else { el.classList.remove('active'); }
    } catch(ex) {}
  });
}

document.addEventListener('selectionchange', updateActive);
ed.addEventListener('input', notifyChange);
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
      if (e.data.type === "htmlChange") {
        onHtmlChange(e.data.html ?? "");
      } else if (e.data.type === "insertImage") {
        onInsertImageRequest(e.data.dataUrl ?? "", e.data.mimeType ?? "image/jpeg");
      }
    },
    [onHtmlChange, onInsertImageRequest],
  );

  React.useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={WEB_EDITOR_HTML}
      style={{
        width: "100%",
        height: 460,
        border: "none",
        borderRadius: 8,
        background: "#0f0f1e",
      } as React.CSSProperties}
      sandbox="allow-scripts allow-same-origin"
      title="Article editor"
    />
  );
}


// ─── Native link modal ────────────────────────────────────────────────────────
interface LinkModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (text: string, url: string) => void;
}

function LinkModal({ visible, onClose, onConfirm }: LinkModalProps) {
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const handleConfirm = useCallback(() => {
    onConfirm(linkText.trim(), linkUrl.trim());
    setLinkText("");
    setLinkUrl("");
  }, [linkText, linkUrl, onConfirm]);

  const handleClose = useCallback(() => {
    setLinkText("");
    setLinkUrl("");
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.box}>
          <Text style={modalStyles.title}>Insert Link</Text>
          <Text style={modalStyles.label}>Display Text</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="e.g. Click here"
            placeholderTextColor={Colors.textMuted}
            value={linkText}
            onChangeText={setLinkText}
          />
          <Text style={modalStyles.label}>URL</Text>
          <TextInput
            style={modalStyles.input}
            placeholder="https://"
            placeholderTextColor={Colors.textMuted}
            value={linkUrl}
            onChangeText={setLinkUrl}
            keyboardType="url"
            autoCapitalize="none"
          />
          <View style={modalStyles.row}>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnCancel]} onPress={handleClose}>
              <Text style={modalStyles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[modalStyles.btn, modalStyles.btnOk]} onPress={handleConfirm}>
              <Text style={modalStyles.btnOkText}>Insert Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.70)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 7,
    padding: 10,
    color: Colors.textPrimary,
    fontSize: 13,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 4 },
  btn: { flex: 1, padding: 10, borderRadius: 7, alignItems: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: Colors.borderNeutral },
  btnOk: { backgroundColor: Colors.primary },
  btnCancelText: { color: Colors.textMuted, fontWeight: "600" },
  btnOkText: { color: Colors.textPrimary, fontWeight: "600" },
});


// ─── StyleSheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.bgBase },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // Title input
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    padding: 14,
    marginBottom: 12,
  },

  // Editor wrapper
  editorCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    overflow: "hidden",
    marginBottom: 16,
    minHeight: 460,
  },

  // Cover image
  coverLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 6,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  coverPicker: {
    height: 180,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: Colors.borderNeutral,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
    marginBottom: 16,
    overflow: "hidden",
  },
  coverPreview: { width: "100%", height: "100%", resizeMode: "cover" },
  coverPickerText: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },
  coverRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderDefault,
    marginVertical: 16,
  },

  // Section labels
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  // Tags
  tagInput: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 8,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: {
    backgroundColor: Colors.redSurface,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: { color: Colors.primary, fontSize: 12 },

  // Visibility tiles
  visRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  visTile: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    gap: 4,
  },
  visTileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.redSurface,
  },
  visTileLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  visTileLabelActive: { color: Colors.primary },
  visTileDesc: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },

  // Toggles
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderDefault,
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  toggleDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  priceInput: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 8,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    marginBottom: 12,
  },

  // Price row — amount + currency side by side
  priceRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  priceAmountInput: {
    flex: 1,
    marginBottom: 0,
  },
  priceCurrencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 90,
  },
  priceCurrencyBtnText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
  },

  // Currency picker modal
  cpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  cpSheet: {
    backgroundColor: "#141428",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "55%",
  },
  cpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cpTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  cpOption: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 4,
  },
  cpOptionActive: {
    backgroundColor: "rgba(198,34,41,0.10)",
  },
  cpOptionText: {
    fontSize: 14,
    color: "#D1D5DB",
    minWidth: 52,
    fontWeight: "600",
  },
  cpOptionTextActive: {
    color: Colors.primary,
  },
  cpOptionSub: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },

  // Approval notice
  noticeBox: {
    backgroundColor: Colors.redSurface,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  noticeText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  // Buttons
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderNeutral,
    alignItems: "center",
  },
  cancelBtnText: { color: Colors.textMuted, fontWeight: "600", fontSize: 15 },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  submitBtnText: { color: Colors.textPrimary, fontWeight: "700", fontSize: 15 },
  submitBtnDisabled: { opacity: 0.5 },
});


// ─── Image upload helper ──────────────────────────────────────────────────────
async function uploadImageBlob(
  uriOrDataUrl: string,
  mimeType: string,
  generateUploadUrl: () => Promise<string>,
): Promise<string | null> {
  try {
    const uploadUrl = await generateUploadUrl();
    const blob: Blob = await (async () => {
      if (uriOrDataUrl.startsWith("data:")) {
        const res = await fetch(uriOrDataUrl);
        return await res.blob();
      }
      const res = await fetch(uriOrDataUrl);
      return await res.blob();
    })();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    });
    const { storageId } = await response.json();
    return storageId ?? null;
  } catch (err) {
    console.warn("uploadImageBlob error:", err);
    return null;
  }
}


// ─── Main composer ────────────────────────────────────────────────────────────
function WriteArticleContent() {
  const router = useRouter();
  const history = useNavigationHistory();
  const createArticle = useMutation(api.articles.createArticle);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Editor state
  const [title, setTitle] = useState("");
  const [richHtml, setRichHtml] = useState(""); // native
  const [webHtml, setWebHtml] = useState("");   // web

  // Cover image
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverMime, setCoverMime] = useState("image/jpeg");

  // Tags
  const [tagsRaw, setTagsRaw] = useState("");

  // Visibility & toggles
  const [isPublic, setIsPublic] = useState(true);
  const [isSensitive, setIsSensitive] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<Currency>("USD");
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  // Wallet — used to default the currency to the user's primary currency
  const walletData = useQuery((api as any)["wallets/getWalletBalance"].getWalletBalance, {});

  // Sync wallet primary currency into priceCurrency once loaded (only if user hasn't changed it)
  const walletSynced = useRef(false);
  React.useEffect(() => {
    if (!walletSynced.current && walletData?.primaryCurrency) {
      setPriceCurrency(walletData.primaryCurrency as Currency);
      walletSynced.current = true;
    }
  }, [walletData]);

  // Submission
  const [submitting, setSubmitting] = useState(false);

  // Native editor ref & link modal
  const richEditorRef = useRef<any>(null);
  const iframeRef = useRef<any>(null);
  const [linkModalVisible, setLinkModalVisible] = useState(false);

  // Derived
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const contentHtml = Platform.OS === "web" ? webHtml : richHtml;

  // Web image insertion: after parent receives dataUrl, upload and inject back
  const handleInsertImageRequest = useCallback(
    async (dataUrl: string, mime: string) => {
      const storageId = await uploadImageBlob(dataUrl, mime, () =>
        generateUploadUrl({}),
      );
      if (storageId && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.insertImageUrl(
          `https://your-convex-deployment.convex.cloud/api/storage/${storageId}`,
        );
      }
    },
    [generateUploadUrl],
  );

  // Pick cover image
  const handlePickCover = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setCoverUri(asset.uri);
      setCoverMime(asset.mimeType ?? "image/jpeg");
    }
  }, []);

  // Native: pick and insert image
  const handleNativeInsertImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const storageId = await uploadImageBlob(
        asset.uri,
        asset.mimeType ?? "image/jpeg",
        () => generateUploadUrl({}),
      );
      if (storageId && richEditorRef.current) {
        richEditorRef.current.insertImage(
          `https://your-convex-deployment.convex.cloud/api/storage/${storageId}`,
        );
      }
    }
  }, [generateUploadUrl]);

  // Native: insert link from modal
  const handleNativeLinkConfirm = useCallback(
    (text: string, url: string) => {
      if (url && richEditorRef.current) {
        richEditorRef.current.insertLink(text || url, url);
      }
      setLinkModalVisible(false);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please add a title for your article.");
      return;
    }
    if (!contentHtml.trim()) {
      Alert.alert("Missing Content", "Please write some content for your article.");
      return;
    }
    if (!coverUri) {
      Alert.alert("Cover image required", "Please upload a cover image for your article.");
      return;
    }
    setSubmitting(true);
    try {
      let coverImage: string | undefined;
      if (coverUri) {
        const sid = await uploadImageBlob(coverUri, coverMime, () =>
          generateUploadUrl({}),
        );
        if (sid) coverImage = sid;
      }
      await createArticle({
        title: title.trim(),
        contentHtml,
        tags,
        isSensitive,
        isPublic,
        isGated: isPremium,
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
  }, [
    title, contentHtml, tags, isSensitive, isPublic, isPremium,
    priceAmount, coverUri, coverMime, createArticle, generateUploadUrl, router,
  ]);

  return (
    <AppBackground style={styles.flex1}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <MobileCard>

          {/* Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Article title…"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={setTitle}
            multiline
            maxLength={200}
          />

          {/* Editor */}
          <View style={styles.editorCard}>
            {Platform.OS === "web" ? (
              <WebRichEditor
                iframeRef={iframeRef}
                onHtmlChange={setWebHtml}
                onInsertImageRequest={handleInsertImageRequest}
              />
            ) : RichEditor && RichToolbar && richActions ? (
              <>
                <RichToolbar
                  editor={richEditorRef}
                  actions={[
                    richActions.setBold, richActions.setItalic, richActions.setUnderline,
                    richActions.setStrikethrough, richActions.setSubscript, richActions.setSuperscript,
                    richActions.heading1, richActions.heading2, richActions.heading3,
                    richActions.setParagraph, richActions.alignLeft, richActions.alignCenter,
                    richActions.alignRight, richActions.alignFull,
                    richActions.insertBulletsList, richActions.insertOrderedList,
                    richActions.blockquote, richActions.insertLink, richActions.insertImage,
                    richActions.setHR, richActions.code, richActions.removeFormat,
                    richActions.undo, richActions.redo,
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
                  editorStyle={{
                    backgroundColor: Colors.bgElevated,
                    color: Colors.textSecondary,
                    caretColor: Colors.primary,
                    placeholderColor: Colors.textMuted,
                    cssText: "font-size:15px; line-height:1.7;",
                  }}
                  style={{ minHeight: 360 }}
                />
                <LinkModal
                  visible={linkModalVisible}
                  onClose={() => setLinkModalVisible(false)}
                  onConfirm={handleNativeLinkConfirm}
                />
              </>
            ) : (
              <View style={{ padding: 20, alignItems: "center" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 13 }}>
                  Rich editor not available. Install react-native-pell-rich-editor.
                </Text>
              </View>
            )}
          </View>

          {/* Cover image */}
          <View style={styles.coverLabelRow}>
            <Text style={styles.label}>Cover Image (16:9)</Text>
            <Text style={styles.requiredBadge}>Required</Text>
          </View>
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover} activeOpacity={0.8}>
            {coverUri ? (
              <>
                <Image source={{ uri: coverUri }} style={styles.coverPreview} />
                <TouchableOpacity
                  style={styles.coverRemoveBtn}
                  onPress={(e) => { e.stopPropagation(); setCoverUri(null); }}
                >
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

          <View style={styles.divider} />

          {/* Tags */}
          <Text style={styles.label}>Tags (comma-separated)</Text>
          <TextInput
            style={styles.tagInput}
            placeholder="e.g. finance, investing, crypto"
            placeholderTextColor={Colors.textMuted}
            value={tagsRaw}
            onChangeText={setTagsRaw}
            autoCapitalize="none"
          />
          {tags.length > 0 && (
            <View style={styles.tagRow}>
              {tags.map((tag, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Visibility */}
          <Text style={styles.label}>Visibility</Text>
          <View style={styles.visRow}>
            <TouchableOpacity
              style={[styles.visTile, isPublic && styles.visTileActive]}
              onPress={() => setIsPublic(true)}
            >
              <Ionicons name="globe-outline" size={20} color={isPublic ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.visTileLabel, isPublic && styles.visTileLabelActive]}>Public</Text>
              <Text style={styles.visTileDesc}>Visible to everyone</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visTile, !isPublic && styles.visTileActive]}
              onPress={() => setIsPublic(false)}
            >
              <Ionicons name="school-outline" size={20} color={!isPublic ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.visTileLabel, !isPublic && styles.visTileLabelActive]}>Course-only</Text>
              <Text style={styles.visTileDesc}>Only course members</Text>
            </TouchableOpacity>
          </View>

          {/* Sensitive content toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Sensitive Content</Text>
              <Text style={styles.toggleDesc}>Requires age confirmation</Text>
            </View>
            <Switch
              value={isSensitive}
              onValueChange={setIsSensitive}
              trackColor={{ false: Colors.borderNeutral, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </View>

          {/* Premium toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Premium Article</Text>
              <Text style={styles.toggleDesc}>Readers pay tokens to unlock</Text>
            </View>
            <Switch
              value={isPremium}
              onValueChange={setIsPremium}
              trackColor={{ false: Colors.borderNeutral, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
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
                accessibilityLabel="Article price"
              />
              <TouchableOpacity
                style={styles.priceCurrencyBtn}
                onPress={() => setCurrencyPickerOpen(true)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Currency: ${priceCurrency}`}
              >
                <Text style={styles.priceCurrencyBtnText} allowFontScaling={false}>
                  {CURRENCY_SYMBOLS[priceCurrency]} {priceCurrency}
                </Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Currency picker modal */}
          <Modal
            visible={currencyPickerOpen}
            transparent
            animationType="slide"
            onRequestClose={() => setCurrencyPickerOpen(false)}
          >
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
                      <TouchableOpacity
                        style={[styles.cpOption, active && styles.cpOptionActive]}
                        onPress={() => { setPriceCurrency(item); setCurrencyPickerOpen(false); }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                      >
                        <Text style={[styles.cpOptionText, active && styles.cpOptionTextActive]} allowFontScaling={false}>
                          {CURRENCY_SYMBOLS[item]}  {item}
                        </Text>
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
            <Text style={styles.noticeText}>
              Articles are reviewed by our team before being published. You will receive a notification once your article is approved or if changes are needed.
            </Text>
          </View>

          {/* Action buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => history.goBack(router, "/(tabs)/learn")} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.textPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Submit for Review</Text>
              )}
            </TouchableOpacity>
          </View>

          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}


// ─── Auth guard wrapper (default export) ─────────────────────────────────────
export default function WriteArticleScreen() {
  return (
    <>
      <AuthLoading>
        <AppLoader />
      </AuthLoading>
      <Unauthenticated>
        <Redirect href="/SignIn" />
      </Unauthenticated>
      <Authenticated>
        <WriteArticleContent />
      </Authenticated>
    </>
  );
}
