/* izakanpai shared uncertain-write idempotency journal (inventory / PO / AI).
 * Stores ONLY SHA-256 of operation input, opaque request ID and timestamp.
 * Never keeps inventory names, PO details, menu prompts, tokens or results.
 * Per environment/store/employee/session; never replays automatically.
 */
(function(root){
  'use strict';
  var prefix='izakanpai:pending-write:v1:';
  var maxAge=7*24*60*60*1000;
  var maxPending=64;
  function actor(){
    var api=root.API;
    var token=api&&api.currentToken&&api.currentToken();
    if(typeof token!=='string'||!token.includes('.'))throw Error('pending_write_auth_required');
    var dot=token.lastIndexOf('.'),parts=token.slice(0,dot).split('~');
    if((parts[0]!=='v2'&&parts[0]!=='v3')||parts.length<6||
      !parts[3]||!parts[4]||!parts[5])throw Error('pending_write_auth_required');
    var store=api.currentStoreId();
    if(!store||parts[3]!==store)throw Error('pending_write_store_mismatch');
    // v3 session survives access-token refresh; v2 locks to one token.
    var session=parts[6]||token.slice(dot+1);
    if(!session)throw Error('pending_write_session_missing');
    return [parts[5],store,parts[4],session].join('|');
  }
  async function hash(value){
    if(!root.crypto||!root.crypto.subtle)throw Error('pending_write_crypto_unavailable');
    var bytes=new TextEncoder().encode(String(value));
    var digest=await root.crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),function(b){
      return b.toString(16).padStart(2,'0');
    }).join('');
  }
  async function address(feature){
    if(!/^(?:stock_movement|purchase_order|menu_photo)$/.test(feature))
      throw Error('pending_write_unknown_feature');
    return prefix+await hash(actor()+'|'+feature);
  }
  function read(key){
    var data=JSON.parse(root.localStorage.getItem(key)||'null');
    var entries=data&&typeof data==='object'?data.entries:null;
    if(!entries||typeof entries!=='object'||Array.isArray(entries))return {};
    var result={};
    for(var digest of Object.keys(entries)){
      var record=entries[digest];
      if(!/^[a-f0-9]{64}$/.test(digest)||!record||
        !/^[A-Za-z0-9_.:-]{8,160}$/.test(String(record.id||''))||
        !Number.isFinite(record.at)||record.at>Date.now()||
        Date.now()-record.at>maxAge)continue;
      result[digest]=record;
    }
    return result;
  }
  function persist(key,entries){
    root.localStorage.setItem(key,JSON.stringify({entries:entries}));
    var actual=read(key);
    if(JSON.stringify(actual)!==JSON.stringify(entries))
      throw Error('pending_write_storage_failed');
  }
  async function begin(feature,signature,idFactory){
    var key=await address(feature);
    var digest=await hash(signature);
    var entries=read(key),prior=entries[digest];
    if(prior)return {id:prior.id,replayed:true};
    // Never evict a live unconfirmed operation to make space: otherwise a
    // later re-entry of its exact input would mint a duplicate request ID.
    if(Object.keys(entries).length>=maxPending)
      throw Error('pending_write_capacity_exceeded');
    var id=String(idFactory());
    if(!/^[A-Za-z0-9_.:-]{8,160}$/.test(id))
      throw Error('pending_write_invalid_id');
    entries[digest]={id:id,at:Date.now()};
    persist(key,entries);
    return {id,replayed:false};
  }
  async function peek(feature,signature){
    var key=await address(feature),digest=await hash(signature);
    var record=read(key)[digest];
    return record?{id:record.id,replayed:true}:null;
  }
  async function clear(feature,expectedId){
    var key=await address(feature),entries=read(key);
    for(var digest of Object.keys(entries)){
      if(entries[digest].id!==expectedId)continue;
      delete entries[digest];
      if(Object.keys(entries).length)persist(key,entries);
      else root.localStorage.removeItem(key);
    }
  }
  root.IZPendingWrite=Object.freeze({begin:begin,peek:peek,clear:clear});
})(window);
