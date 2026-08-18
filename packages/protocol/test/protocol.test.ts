import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION, message, readFromPreview, readToPreview } from "../src/index";

/**
 * Le protocole traverse une frontière de sécurité : l'aperçu est servi depuis un
 * autre domaine, dans une iframe en bac à sable. Chaque camp valide ce qu'il
 * reçoit, sans faire confiance à l'autre.
 */

describe("lecture d'un message", () => {
  it("accepte un message bien formé", () => {
    const msg = message("FIELD_CLICK", { fieldId: "fld_abc" });
    expect(readFromPreview(msg)).toEqual({
      protocol: "calque",
      version: PROTOCOL_VERSION,
      type: "FIELD_CLICK",
      payload: { fieldId: "fld_abc" },
    });
  });

  /**
   * Une fenêtre reçoit des messages de toutes sortes — extensions, outils de
   * développement, autres iframes. Lever sur chacun rendrait l'éditeur
   * inutilisable ; on ignore en silence.
   */
  it("ignore ce qui n'est pas un message Calque", () => {
    expect(readFromPreview(null)).toBeNull();
    expect(readFromPreview("bonjour")).toBeNull();
    expect(readFromPreview({ type: "FIELD_CLICK" })).toBeNull();
    expect(readFromPreview({ source: "react-devtools-bridge" })).toBeNull();
  });

  it("ignore un message d'une autre version du protocole", () => {
    expect(
      readFromPreview({
        protocol: "calque",
        version: PROTOCOL_VERSION + 1,
        type: "FIELD_CLICK",
        payload: { fieldId: "fld_abc" },
      }),
    ).toBeNull();
  });

  it("refuse une charge utile du mauvais type", () => {
    expect(
      readFromPreview({
        protocol: "calque",
        version: PROTOCOL_VERSION,
        type: "HOVER",
        payload: { fieldId: 42 },
      }),
    ).toBeNull();
  });

  it("ne confond pas les deux sens de circulation", () => {
    const versApercu = message("SET_MODE", { mode: "edition" });
    expect(readToPreview(versApercu)).not.toBeNull();
    expect(readFromPreview(versApercu)).toBeNull();
  });
});

describe("messages du panneau vers l'aperçu", () => {
  it("porte une valeur de n'importe quelle forme, avec son type", () => {
    const msg = message("SET_VALUE", {
      fieldId: "fld_1",
      type: "image",
      value: { src: "a.jpg", alt: "A" },
    });
    const lu = readToPreview(msg);
    expect(lu?.type).toBe("SET_VALUE");
  });

  it("applique la valeur par défaut de l'illumination générale", () => {
    const lu = readToPreview({
      protocol: "calque",
      version: PROTOCOL_VERSION,
      type: "HIGHLIGHT",
      payload: { fieldId: null },
    });
    expect(lu?.type === "HIGHLIGHT" && lu.payload.showAll).toBe(false);
  });

  it("refuse un cadrage inconnu", () => {
    expect(
      readToPreview({
        protocol: "calque",
        version: PROTOCOL_VERSION,
        type: "SET_VIEWPORT",
        payload: { viewport: "montre" },
      }),
    ).toBeNull();
  });
});
