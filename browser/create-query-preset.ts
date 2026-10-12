(()=>{
    const apply=()=>{
      const form=document.querySelector("form.create-form[data-query-preset]");
      if(!(form instanceof HTMLFormElement))return;
      const params=new URLSearchParams(location.search);
      if(params.get("restore")==="1")return;
      const values={target_url:null,custom_slug:null,word_slug_enabled:null,unlock_at:null,expires_at:null,max_open_count:null,limit_reached_action:new Set(["end","redirect"]),limit_reached_target_url:null,switch_at:null,scheduled_target_url:null,ended_message:null,preview_mode:new Set(["none","target_og","custom","target_url"]),og_title:null,og_description:null,og_image_url:null,entry_label:null,entry_slug:null,entry_expires_at:null,entry_ended_message:null,entry_preview_mode:new Set(["none","target_og","custom","target_url"]),entry_og_title:null,entry_og_description:null,entry_og_image_url:null};
      const setValue=(name: string,allowed: Set<string> | null)=>{
        const value=params.get(name);
        if(value===null||(allowed instanceof Set&&!allowed.has(value)))return false;
        const selector='input[name="'+name+'"],select[name="'+name+'"],textarea[name="'+name+'"]'+(name==="limit_reached_action"?",#limit_reached_action":"");
        const controls=[...form.querySelectorAll(selector)];
        if(!controls.length)return false;
        const first=controls[0];
        if(first instanceof HTMLInputElement&&first.type==="checkbox"){first.checked=value==="1"||value==="true";return true}
        if(first instanceof HTMLInputElement&&first.type==="radio"){for(const control of controls)if(control instanceof HTMLInputElement)control.checked=control.value===value;return true}
        if(first instanceof HTMLSelectElement&&!Array.from(first.options).some(option=>option.value===value))return false;
        for(const control of controls)if(control instanceof HTMLInputElement||control instanceof HTMLSelectElement||control instanceof HTMLTextAreaElement)control.value=value;
        return true;
      };
      const changed=new Set<string>;
      for(const [name,allowed] of Object.entries(values))if(setValue(name,allowed))changed.add(name);
      const conditionFields={period:["unlock_at","expires_at"],limit:["max_open_count","limit_reached_action","limit_reached_target_url"],schedule:["switch_at","scheduled_target_url"],protection:[],"end-display":["ended_message"],preview:["preview_mode","og_title","og_description","og_image_url"],audience:["entry_label","entry_slug","entry_expires_at","entry_ended_message","entry_preview_mode","entry_og_title","entry_og_description","entry_og_image_url"]};
      let opened=false;
      for(const [kind,fields] of Object.entries(conditionFields)){
        const toggle=document.getElementById(kind+"_enabled"),explicit=params.get(kind+"_enabled");
        if(!(toggle instanceof HTMLInputElement))continue;
        const enabled=explicit===null?fields.some(name=>changed.has(name)):(explicit==="1"||explicit==="true");
        if(explicit!==null||enabled){toggle.checked=enabled;toggle.dispatchEvent(new Event("change",{bubbles:true}));opened=opened||enabled}
      }
      if(changed.has("word_slug_enabled")){const word=form.elements.namedItem("word_slug_enabled");if(word instanceof HTMLInputElement)word.dispatchEvent(new Event("change",{bubbles:true}))}
      if(opened){const details=form.querySelector(".create-settings");if(details instanceof HTMLDetailsElement)details.open=true}
      form.dispatchEvent(new Event("input",{bubbles:true}));
      form.dispatchEvent(new Event("change",{bubbles:true}));
    };
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply,{once:true});else apply();
  })();
