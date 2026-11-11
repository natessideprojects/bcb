import test from "node:test";
import assert from "node:assert/strict";
import {encodeGuest,decodeGuest,newGuestId,isGuestId} from "../src/lib/guest";
process.env.NEON_AUTH_COOKIE_SECRET ||= "test-secret-for-guest-cookies-0123456789";

test("guest cookies round-trip and reject tampering",()=>{
 const id=newGuestId();assert.ok(isGuestId(id));
 const value=encodeGuest({id,name:"Corndog Kid"});
 assert.deepEqual(decodeGuest(value),{id,name:"Corndog Kid",isTest:true,guest:true});
 const [i,n,sig]=value.split(".");
 assert.equal(decodeGuest(`${i}.${Buffer.from("Someone Else").toString("base64url")}.${sig}`),null,"renamed without a new signature");
 assert.equal(decodeGuest(`guest-00000000-0000-0000-0000-000000000000.${n}.${sig}`),null,"swapped id");
 assert.equal(decodeGuest(`${i}.${n}.${sig.slice(0,-2)}xx`),null,"bad signature");
 assert.equal(decodeGuest(encodeGuest({id:"user-123",name:"Real account"})),null,"only guest ids are accepted");
 assert.equal(decodeGuest(undefined),null);
});
