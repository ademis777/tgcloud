export type PreviewKind="image"|"video"|"audio"|"pdf"|"text"|"unsupported";
export type PreviewDescriptor={kind:PreviewKind;contentType:string};
const extensions:Record<string,PreviewDescriptor>={
 jpg:{kind:"image",contentType:"image/jpeg"},jpeg:{kind:"image",contentType:"image/jpeg"},
 png:{kind:"image",contentType:"image/png"},gif:{kind:"image",contentType:"image/gif"},
 webp:{kind:"image",contentType:"image/webp"},avif:{kind:"image",contentType:"image/avif"},
 mp4:{kind:"video",contentType:"video/mp4"},webm:{kind:"video",contentType:"video/webm"},
 mov:{kind:"video",contentType:"video/quicktime"},m4v:{kind:"video",contentType:"video/mp4"},
 mp3:{kind:"audio",contentType:"audio/mpeg"},wav:{kind:"audio",contentType:"audio/wav"},
 m4a:{kind:"audio",contentType:"audio/mp4"},ogg:{kind:"audio",contentType:"audio/ogg"},
 oga:{kind:"audio",contentType:"audio/ogg"},flac:{kind:"audio",contentType:"audio/flac"},
 pdf:{kind:"pdf",contentType:"application/pdf"},
 txt:{kind:"text",contentType:"text/plain; charset=utf-8"},
 md:{kind:"text",contentType:"text/plain; charset=utf-8"},
 csv:{kind:"text",contentType:"text/plain; charset=utf-8"},
 json:{kind:"text",contentType:"text/plain; charset=utf-8"},
 log:{kind:"text",contentType:"text/plain; charset=utf-8"},
 xml:{kind:"text",contentType:"text/plain; charset=utf-8"},
};
const aliases:Record<string,string>={
 "image/jpg":"jpg","video/x-m4v":"m4v","audio/x-wav":"wav",
 "audio/x-m4a":"m4a","application/json":"json","text/plain":"txt",
 "text/markdown":"md","text/csv":"csv","application/xml":"xml","text/xml":"xml",
};
const unsafe=new Set(["text/html","application/xhtml+xml","image/svg+xml","application/javascript","text/javascript"]);
export function previewDescriptor(mime:string|null|undefined,name:string):PreviewDescriptor{
 const type=(mime||"").split(";")[0].trim().toLowerCase();
 if(unsafe.has(type))return {kind:"unsupported",contentType:"application/octet-stream"};
 const ext=name.toLowerCase().split(".").at(-1)||"";
 if(type==="application/pdf")return extensions.pdf;
 if(aliases[type])return extensions[aliases[type]];
 if(type && type!=="application/octet-stream" && type!=="binary/octet-stream"){
   if(extensions[ext]?.contentType.split(";")[0]===type)return extensions[ext];
   return {kind:"unsupported",contentType:"application/octet-stream"};
 }
 return extensions[ext]||{kind:"unsupported",contentType:"application/octet-stream"};
}
