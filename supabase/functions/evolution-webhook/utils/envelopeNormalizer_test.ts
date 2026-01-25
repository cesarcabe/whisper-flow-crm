/**
 * Testes para envelopeNormalizer.ts
 */

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeEvolutionEnvelope, normalizeStatusUpdate } from "../utils/envelopeNormalizer.ts";

Deno.test("normalizeEvolutionEnvelope - DM with PN and LID alt", () => {
  const data = {
    key: {
      remoteJid: "558399999999@s.whatsapp.net",
      remoteJidAlt: "123456789@lid",
      fromMe: false,
      id: "MSG001",
    },
    pushName: "João",
    message: {
      conversation: "Olá, tudo bem?",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.conversationType, "dm");
  assertEquals(envelope!.conversationJid, "558399999999@s.whatsapp.net");
  assertEquals(envelope!.senderJid, "558399999999@s.whatsapp.net");
  assertEquals(envelope!.senderPhone, "558399999999");
  assertEquals(envelope!.remoteJidAlt, "123456789@lid");
  assertEquals(envelope!.pushName, "João");
  assertEquals(envelope!.fromMe, false);
  assertEquals(envelope!.text, "Olá, tudo bem?");
  assertEquals(envelope!.messageType, "text");
});

Deno.test("normalizeEvolutionEnvelope - DM with only LID", () => {
  const data = {
    key: {
      remoteJid: "123456789@lid",
      fromMe: false,
      id: "MSG002",
    },
    message: {
      conversation: "Mensagem via LID",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.conversationType, "dm");
  assertEquals(envelope!.senderJid, "123456789@lid");
  assertEquals(envelope!.senderPhone, null);
  assertEquals(envelope!.remoteJidAlt, null);
});

Deno.test("normalizeEvolutionEnvelope - DM with LID main and PN alt", () => {
  const data = {
    key: {
      remoteJid: "123456789@lid",
      remoteJidAlt: "558399999999@s.whatsapp.net",
      fromMe: false,
      id: "MSG003",
    },
    message: {
      conversation: "Teste",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.conversationType, "dm");
  // senderPhone should be extracted from alt
  assertEquals(envelope!.senderPhone, "558399999999");
});

Deno.test("normalizeEvolutionEnvelope - Group with PN participant", () => {
  const data = {
    key: {
      remoteJid: "120363123456789@g.us",
      participant: "558399999999@s.whatsapp.net",
      fromMe: false,
      id: "MSG004",
    },
    pushName: "Maria",
    message: {
      conversation: "Mensagem no grupo",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.conversationType, "group");
  assertEquals(envelope!.conversationJid, "120363123456789@g.us");
  assertEquals(envelope!.senderJid, "558399999999@s.whatsapp.net");
  assertEquals(envelope!.senderPhone, "558399999999");
  assertEquals(envelope!.pushName, "Maria");
});

Deno.test("normalizeEvolutionEnvelope - Group with LID participant", () => {
  const data = {
    key: {
      remoteJid: "120363123456789@g.us",
      participant: "999888777@lid",
      fromMe: false,
      id: "MSG005",
    },
    message: {
      conversation: "Mensagem de participante LID",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.conversationType, "group");
  assertEquals(envelope!.senderJid, "999888777@lid");
  assertEquals(envelope!.senderPhone, null);
});

Deno.test("normalizeEvolutionEnvelope - fromMe message", () => {
  const data = {
    key: {
      remoteJid: "558399999999@s.whatsapp.net",
      fromMe: true,
      id: "MSG006",
    },
    message: {
      conversation: "Mensagem enviada",
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.fromMe, true);
  assertEquals(envelope!.pushName, null); // pushName é ignorado para fromMe
});

Deno.test("normalizeEvolutionEnvelope - Image message", () => {
  const data = {
    key: {
      remoteJid: "558399999999@s.whatsapp.net",
      fromMe: false,
      id: "MSG007",
    },
    message: {
      imageMessage: {
        caption: "Foto bonita",
        mimetype: "image/jpeg",
      },
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.messageType, "image");
  assertEquals(envelope!.hasMedia, true);
  assertEquals(envelope!.text, "Foto bonita");
});

Deno.test("normalizeEvolutionEnvelope - Audio message", () => {
  const data = {
    key: {
      remoteJid: "558399999999@s.whatsapp.net",
      fromMe: false,
      id: "MSG008",
    },
    message: {
      audioMessage: {
        mimetype: "audio/ogg",
        seconds: 10,
      },
    },
  };
  
  const envelope = normalizeEvolutionEnvelope(data);
  
  assertNotEquals(envelope, null);
  assertEquals(envelope!.messageType, "audio");
  assertEquals(envelope!.hasMedia, true);
});

Deno.test("normalizeEvolutionEnvelope - null/empty input", () => {
  assertEquals(normalizeEvolutionEnvelope(null as any), null);
  assertEquals(normalizeEvolutionEnvelope({} as any), null);
  assertEquals(normalizeEvolutionEnvelope({ key: {} } as any), null);
});

// Status Update tests
Deno.test("normalizeStatusUpdate - basic update", () => {
  const data = {
    key: {
      remoteJid: "558399999999@s.whatsapp.net",
      id: "MSG001",
    },
    status: "read",
  };
  
  const update = normalizeStatusUpdate(data);
  
  assertNotEquals(update, null);
  assertEquals(update!.providerMessageId, "MSG001");
  assertEquals(update!.newStatus, "read");
  assertEquals(update!.remoteJid, "558399999999@s.whatsapp.net");
});

Deno.test("normalizeStatusUpdate - ack style update", () => {
  const data = {
    key: {
      id: "MSG002",
    },
    ack: "delivered",
  };
  
  const update = normalizeStatusUpdate(data);
  
  assertNotEquals(update, null);
  assertEquals(update!.providerMessageId, "MSG002");
  assertEquals(update!.newStatus, "delivered");
});

Deno.test("normalizeStatusUpdate - update object style", () => {
  const data = {
    id: "MSG003",
    update: {
      status: "sent",
    },
  };
  
  const update = normalizeStatusUpdate(data);
  
  assertNotEquals(update, null);
  assertEquals(update!.providerMessageId, "MSG003");
  assertEquals(update!.newStatus, "sent");
});

Deno.test("normalizeStatusUpdate - missing messageId returns null", () => {
  const data = {
    status: "read",
  };
  
  const update = normalizeStatusUpdate(data);
  assertEquals(update, null);
});
