/**
 * Testes para jidParser.ts
 */

import { 
  assertEquals, 
  assertNotEquals 
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { 
  parseJid, 
  isPhoneNumber, 
  isGroup, 
  isLid, 
  extractPhoneDigits, 
  getCanonicalJid 
} from "../utils/jidParser.ts";

Deno.test("parseJid - PN (Phone Number)", () => {
  const result = parseJid("558399999999@s.whatsapp.net");
  
  assertEquals(result?.type, "pn");
  assertEquals(result?.digits, "558399999999");
  assertEquals(result?.suffix, "@s.whatsapp.net");
  assertEquals(result?.raw, "558399999999@s.whatsapp.net");
});

Deno.test("parseJid - LID", () => {
  const result = parseJid("123456789@lid");
  
  assertEquals(result?.type, "lid");
  assertEquals(result?.digits, null);
  assertEquals(result?.suffix, "@lid");
});

Deno.test("parseJid - Group", () => {
  const result = parseJid("120363123456789@g.us");
  
  assertEquals(result?.type, "group");
  assertEquals(result?.digits, null);
  assertEquals(result?.suffix, "@g.us");
});

Deno.test("parseJid - null input", () => {
  assertEquals(parseJid(null), null);
  assertEquals(parseJid(undefined), null);
  assertEquals(parseJid(""), null);
});

Deno.test("isPhoneNumber - valid PN", () => {
  const jid = parseJid("558399999999@s.whatsapp.net");
  assertEquals(isPhoneNumber(jid), true);
});

Deno.test("isPhoneNumber - LID returns false", () => {
  const jid = parseJid("123456789@lid");
  assertEquals(isPhoneNumber(jid), false);
});

Deno.test("isPhoneNumber - Group returns false", () => {
  const jid = parseJid("120363123456789@g.us");
  assertEquals(isPhoneNumber(jid), false);
});

Deno.test("isGroup - identifies groups correctly", () => {
  assertEquals(isGroup("120363123456789@g.us"), true);
  assertEquals(isGroup("558399999999@s.whatsapp.net"), false);
  assertEquals(isGroup("123456789@lid"), false);
  assertEquals(isGroup(null), false);
});

Deno.test("isLid - identifies LID correctly", () => {
  assertEquals(isLid("123456789@lid"), true);
  assertEquals(isLid("558399999999@s.whatsapp.net"), false);
  assertEquals(isLid("120363123456789@g.us"), false);
  assertEquals(isLid(null), false);
});

Deno.test("extractPhoneDigits - extracts from PN", () => {
  assertEquals(extractPhoneDigits("558399999999@s.whatsapp.net"), "558399999999");
  assertEquals(extractPhoneDigits("123456789@lid"), null);
  assertEquals(extractPhoneDigits("120363123456789@g.us"), null);
});

Deno.test("getCanonicalJid - prefers PN over LID", () => {
  // PN como main
  assertEquals(
    getCanonicalJid("558399999999@s.whatsapp.net", "123456789@lid"),
    "558399999999@s.whatsapp.net"
  );
  
  // LID como main, PN como alt
  assertEquals(
    getCanonicalJid("123456789@lid", "558399999999@s.whatsapp.net"),
    "558399999999@s.whatsapp.net"
  );
  
  // Apenas LID
  assertEquals(
    getCanonicalJid("123456789@lid", null),
    "123456789@lid"
  );
  
  // Grupo (sempre canonical)
  assertEquals(
    getCanonicalJid("120363123456789@g.us", null),
    "120363123456789@g.us"
  );
});
