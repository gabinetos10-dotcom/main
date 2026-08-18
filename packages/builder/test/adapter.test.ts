import { describe, expect, it } from "vitest";
import { loadFixtureSnapshot } from "@calque/fixtures";
import { analyze } from "@calque/parser";
import {
  applyLabelPatch,
  contentRemapping,
  createStaticHtmlAdapter,
} from "../src/adapter";
import { initialContent } from "../src/index";

/**
 * `SiteAdapter` (§24) : parser et builder derrière une seule interface, pour que
 * la v2 puisse brancher un adaptateur « site avec build step » sans toucher au
 * blueprint ni à l'éditeur.
 */

const EPOCH = new Date("2026-01-01T00:00:00.000Z");

describe("createStaticHtmlAdapter", () => {
  it("annonce ce qu'il sait faire", () => {
    const adaptateur = createStaticHtmlAdapter();
    expect(adaptateur.id).toBe("static-html");
    expect(adaptateur.capabilities.byteIdenticalRebuild).toBe(true);
  });

  it("boucle analyse puis build sans perdre un octet", async () => {
    const adaptateur = createStaticHtmlAdapter();
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");

    const { blueprint } = await adaptateur.analyze(snapshot, { now: EPOCH });
    const resultat = await adaptateur.build(
      snapshot,
      blueprint,
      initialContent(blueprint),
    );

    const source = snapshot.files.find((f) => f.path === "index.html")?.content;
    const produit = resultat.files.find((f) => f.path === "index.html")?.content;
    expect(
      Buffer.from(produit as Uint8Array).equals(Buffer.from(source as Uint8Array)),
    ).toBe(true);
  });
});

describe("applyLabelPatch", () => {
  it("renomme sans muter le blueprint d'origine", async () => {
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");
    const { blueprint } = await analyze(snapshot, { now: EPOCH });
    const champ = blueprint.pages[0]?.blocks[1]?.fields[0];

    const renomme = applyLabelPatch(blueprint, {
      blueprintVersion: blueprint.blueprintVersion,
      generatedAt: EPOCH.toISOString(),
      labels: { [champ?.id as string]: "Photo d'accueil" },
    });

    expect(renomme.pages[0]?.blocks[1]?.fields[0]?.label).toBe("Photo d'accueil");
    expect(blueprint.pages[0]?.blocks[1]?.fields[0]?.label).toBe(champ?.label);
  });
});

describe("reconcile", () => {
  /**
   * Le scénario du §8 : l'agence redéploie une v2 du design. Les `domPath`
   * bougent, les identifiants aussi — et les contenus du client doivent
   * survivre.
   */
  it("retrouve les champs d'une page dont une section a été insérée en tête", async () => {
    const adaptateur = createStaticHtmlAdapter();
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");
    const { blueprint: avant } = await analyze(snapshot, { now: EPOCH });

    const decodeur = new TextDecoder();
    const encodeur = new TextEncoder();
    const html = decodeur.decode(
      snapshot.files.find((f) => f.path === "index.html")?.content as Uint8Array,
    );
    const v2 = html.replace(
      '<main id="accueil">',
      '<main id="accueil">\n  <section class="bandeau"><p>Nouvelle offre de printemps</p></section>',
    );

    const { blueprint: apres } = await analyze(
      {
        ...snapshot,
        files: snapshot.files.map((fichier) =>
          fichier.path === "index.html"
            ? { ...fichier, content: encodeur.encode(v2) }
            : fichier,
        ),
      },
      { now: EPOCH },
    );

    const plan = await adaptateur.reconcile(avant, apres);

    expect(plan.summary.conserves).toBeGreaterThan(30);
    expect(plan.summary.orphelins).toBe(0);
    expect(plan.summary.nouveaux).toBeGreaterThanOrEqual(1);

    // Le titre principal est retrouvé malgré le décalage de tous les rangs.
    const titre = avant.pages[0]?.blocks
      .flatMap((bloc) => bloc.fields)
      .find((champ) => champ.value === "Le bois massif, façonné pour durer");
    const entree = plan.entries.find((e) => e.previousFieldId === titre?.id);
    expect(entree?.status).toBe("conserve");
    expect(entree?.nextFieldId).not.toBe(titre?.id);
  });

  it("déclare orphelin un champ que la v2 a supprimé", async () => {
    const adaptateur = createStaticHtmlAdapter();
    const snapshot = await loadFixtureSnapshot("01-artisan-landing");
    const { blueprint: avant } = await analyze(snapshot, { now: EPOCH });

    const decodeur = new TextDecoder();
    const encodeur = new TextEncoder();
    const html = decodeur.decode(
      snapshot.files.find((f) => f.path === "index.html")?.content as Uint8Array,
    );
    const v2 = html.replace(/<section id="avis"[\s\S]*?<\/section>/u, "");

    const { blueprint: apres } = await analyze(
      {
        ...snapshot,
        files: snapshot.files.map((fichier) =>
          fichier.path === "index.html"
            ? { ...fichier, content: encodeur.encode(v2) }
            : fichier,
        ),
      },
      { now: EPOCH },
    );

    const plan = await adaptateur.reconcile(avant, apres);
    expect(plan.summary.orphelins).toBeGreaterThan(0);
  });

  it("produit une table de réétiquetage utilisable par le contenu", async () => {
    const adaptateur = createStaticHtmlAdapter();
    const snapshot = await loadFixtureSnapshot("02-restaurant-multipage");
    const { blueprint } = await analyze(snapshot, { now: EPOCH });

    const plan = await adaptateur.reconcile(blueprint, blueprint);
    const table = contentRemapping(plan);

    expect(plan.summary.orphelins).toBe(0);
    expect(plan.summary.nouveaux).toBe(0);
    // Un blueprint réconcilié avec lui-même se remappe à l'identique.
    for (const [avant, apres] of Object.entries(table)) expect(apres).toBe(avant);
  });
});
