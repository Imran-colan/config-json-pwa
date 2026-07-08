const { generateCombinations } = require("./index");
const fs = require("fs").promises;
const path = require("path");

const DOWNLOAD_DIR = path.join(__dirname, "_cache_validation");

const data = [
  {
    name: "app_cms_shipping",
    variant_stage: "/app_cms_staging/${country_code}/shipping.json",
    variant_prod: "/app_cms/${country_code}/shipping.json",
  },
  {
    name: "cms_return",
    variant_stage: "/app_cms_staging/return.json",
    variant_prod: "/app_cms/return.json",
  },
  {
    name: "app_cms_security",
    variant_stage: "/app_cms_staging/security.json",
    variant_prod: "/app_cms/security.json",
  },
  {
    name: "mega_menu_brands",
    variant_stage: "/brands/data_stg/mega_menu_brands_2024-03-11.json",
    variant_prod: "/brands/data_prd/mega_menu_brands_2024-03-11.json",
  },
  {
    name: "bottom_tab_msite",
    variant_stage: "/config_staging/bottom_tab_msite.json",
    variant_prod: "/config/bottom_tab_msite.json",
  },
  {
    name: "brand_logos",
    variant_stage: "/config_staging/brand_logos.json",
    variant_prod: "/config/brand_logos.json",
  },
  {
    name: "ca_learn_more",
    variant_stage: "/config_staging/CaLearnMore.json",
    variant_prod: "/config/CaLearnMore.json",
  },
  {
    name: "wallet_faq",
    variant_stage: "/config_staging/faq.json",
    variant_prod: "/config/faq.json",
  },
  {
    name: "home_json",
    variant_stage: "/config_staging/homepage/${device-type}/home.json ",
    variant_prod: "/config/homepage/${device-type}/home.json ",
  },
  {
    name: "my_account_menu",
    variant_stage: "/config_staging/rebrand/my_account_menu.json",
    variant_prod: "/config/rebrand/my_account_menu.json",
  },
  {
    name: "our_program",
    variant_stage: "/config_staging/rebrand/our_program.json",
    variant_prod: "/config/rebrand/our_program.json",
  },
  {
    name: "pdp_json",
    variant_stage: "/config_staging/rebrand/pdp/stg/${locale}.json ",
    variant_prod: "/config/rebrand/pdp/${locale}.json ",
  },
  {
    name: "tier_benefit",
    variant_stage: "/config_staging/rebrand/tier-benefits/${locale}.json",
    variant_prod: "/config/rebrand/tier-benefits/${locale}.json",
  },
  {
    name: "trust_social_proof",
    variant_stage: "/config_staging/rebrand/trustAndSocialProofContent.json",
    variant_prod: "/config/rebrand/trustAndSocialProofContent.json",
  },
  {
    name: "club_apparel_info",
    variant_stage: "/config_staging/v1/clubApparelInfo/${locale}.json ",
    variant_prod: "/config/v1/clubApparelInfo/${locale}.json ",
  },
  {
    name: "aivi_onboarding_data",
    variant_stage: "/config_staging/v1/default.json",
    variant_prod: "/config/v1/default.json",
  },
  {
    name: "aivi_onboarding_brands",
    variant_stage: "/config_staging/v1/default.json",
    variant_prod: "/config/v1/default.json",
  },
  {
    name: "unified_faqs",
    variant_stage: "/config_staging/v1/unified_faqs.json",
    variant_prod: "/config/v1/unified_faqs.json",
  },
  {
    name: "search_suggestion",
    variant_stage:
      "/resources/20191010_staging/${locale}/search/search_${men,women,kids,all}.json",
    variant_prod:
      " /resources/20190121/${locale}/search/search_${men,women,kids,all}.json",
  },
  {
    name: "search_v1_suggestion ",
    variant_stage:
      "/resources/20191010_staging/${locale}/search/v1/search_${men,women,kids}.json ",
    variant_prod:
      "/resources/20190121/${locale}/search/v1/search_${men,women,kids}.json ",
  },
  {
    name: "about_page",
    variant_stage: "/resources/20191010_staging/pages/aboutpage.json",
    variant_prod: "/resources/20190121/pages/aboutpage.json",
  },
  {
    name: "PLP Footer",
    variant_stage:
      "/resources/20191010_staging/pages/plp_footer_${women,men,kids,home}.json",
    variant_prod:
      "/resources/20190121/pages/plp_footer_${women,men,kids,home}.json",
  },
  {
    name: "vip_page",
    variant_stage: "/resources/20191010_staging/pages/vip_page.json",
    variant_prod: "/resources/20190121/pages/vip_page.json",
  },
  {
    name: "vip_screen_app",
    variant_stage: "/resources/20191010_staging/pages/vip_screen_app.json",
    variant_prod: "/resources/20190121/pages/vip_screen_app.json",
  },
  {
    name: "schema",
    variant_stage: "/config_staging/seo/${locale}/schema.json",
    variant_prod: "/config/v1/seo/${locale}/schema.json",
  },
  {
    name: "plp_meta",
    variant_stage: "/resources/20191010_staging/${locale}/plp_meta.json",
    variant_prod: "/resources/20190121/${locale}/plp_meta.json",
  },
  {
    name: "unified_terms_and_conditions",
    variant_stage: "/config_staging/v1/unified_terms_and_conditions.json",
    variant_prod: "/config/v1/unified_terms_and_conditions.json",
  },
  {
    name: "ab_testing_config",
    variant_stage: "/config_staging/v2/abtestConfig.json",
    variant_prod: "/config/v2/abtestConfig.json",
  },
  {
    name: "verticals",
    variant_stage:
      "/config_staging/verticals_data/${country_code}/verticals.json ",
    variant_prod: "/config/verticals_data/${country_code}/verticals.json ",
  },
  {
    name: "trending_search",
    variant_stage:
      "/resources/20191010_staging/${country-code}/search/v1/trending_${men,women,kids,all}.json",
    variant_prod:
      "/resources/20190121/${country-code}/search/v1/trending_women.json",
  },
  {
    name: "shop_by_brand",
    variant_stage:
      "/resources/20191010_staging/${locale}/${device-type}/${men,women,kids,all}_shop_by_brand.json",
    variant_prod:
      "/resources/20190121/${locale}/${device-type}/${men,women,kids,all}_shop_by_brand.json",
  },
  {
    name: "store_page_user_segement",
    variant_stage:
      "/resources/20191010_staging/${locale}/${device-type}/${user_segment}_store_page.json",
    variant_prod:
      "/resources/20190121/${locale}/${device-type}/${user_segment}_store_page.json",
  },
  {
    name: "not_found",
    variant_stage:
      "/resources/20191010_staging/${locale}/${device-type}/not_found.json",
    variant_prod: "/resources/20190121/${locale}/${device-type}/not_found.json",
  },
  {
    name: "brands_custom_screens",
    variant_stage:
      "/resources/20191010_staging/${locale}/brands_custom_screens.json",
    variant_prod: "/resources/20190121/${locale}/brands_custom_screens.json",
  },
  {
    name: "categories_custom_categories",
    variant_stage:
      "/resources/20191010_staging/${locale}/categories_custom_categories.json",
    variant_prod:
      "/resources/20190121/${locale}/categories_custom_categories.json",
  },
  {
    name: "influencers",
    variant_stage:
      "/resources/20191010_staging/${locale}/collections/influencers.json",
    variant_prod: "/resources/20190121/${locale}/collections/influencers.json",
  },
  {
    name: "home_custom_categories",
    variant_stage:
      "/resources/20191010_staging/${locale}/home_custom_categories.json",
    variant_prod: "/resources/20190121/${locale}/home_custom_categories.json",
  },
  {
    name: "Notification Tab",
    variant_stage:
      "/resources/20191010_staging/${locale}/notification_tab.json",
    variant_prod: "/resources/20191010_staging/${locale}/notification_tab.json",
  },
  {
    name: "pdp_json",
    variant_stage: "/resources/20191010_staging/${locale}/pdp.json",
    variant_prod: "/resources/20190121/${locale}/pdp.json",
  },
  {
    name: "search_trending_brands",
    variant_stage:
      "/resources/20191010_staging/${locale}/search_trending_brands.json",
    variant_prod: "/resources/20190121/${locale}/search_trending_brands.json",
  },
  {
    name: "search_trending_tags.json",
    variant_stage:
      "/resources/20191010_staging/${locale}/search_trending_tags.json",
    variant_prod: "/resources/20190121/${locale}/search_trending_tags.json",
  },
  {
    name: "more_filter.json",
    variant_stage: "/config_staging/more_filter.json",
    variant_prod: "/config/more_filter.json",
  },
  {
    name: "plp",
    variant_stage:
      "/resources/20191010_staging/${locale}/${device-type}/${men,women,kids,home}_plp.json",
    variant_prod:
      "/resources/20190121/${locale}/${device-type}/${men,women,kids,all}_plp.json",
  },
  {
    name: "mega_menu_desktop",
    variant_stage:
      "/resources/20191010_staging_prodtest/${locale}/categories_${men,women,kids,all,home}.json",
    variant_prod:
      "/resources/20190121/${locale}/categories_${men,women,kids,all,home}.json",
  },
  {
    name: "category_data",
    variant_stage: "/resources/20191010_staging/${language}/categoryData.json",
    variant_prod: "/resources/20190121/${language}/categoryData.json",
  },
  {
    name: "categories_mega_menu",
    variant_stage:
      "/resources/20191010_staging/${locale}/categories_mega_menu_${men,women,kids}.json",
    variant_prod:
      "/resources/20190121/${locale}/categories_mega_menu_${men,women,kids}.json",
  },
  {
    name: "store_page",
    variant_stage:
      "/resources/20191010_staging/${locale}/${device-type}/store_page.json ",
    variant_prod:
      "/resources/20190121/${locale}/${device-type}/store_page.json",
  },
];

const processedData = data.map((item) => {
  const urlVariants = generateCombinations(item.variant_stage);
  const urlVariantsProd = generateCombinations(item.variant_prod);
  return {
    name: item.name,
    url_variants: urlVariants,
    url_variants_prod: urlVariantsProd,
  };
});

const urls = [];

processedData.map((item) => {
  // console.log("\n\n\n");
  // console.log(item.name);
  // console.log(
  //   "==============================================================================",
  // );
  // console.log("VARIANT_STAGE: ");
  item.url_variants.map((url) => {
    const url_stage = `https://config.aivi.com${url.str}`;
    // console.log(url_stage);
    urls.push(url_stage);
  });
  // console.log("VARIANT_PROD: ");
  item.url_variants_prod.map((url) => {
    const url_prod = `https://config.aivi.com${url.str}`;
    // console.log(url_prod);
    urls.push(url_prod);
  });
});

const downloadAllUrls = async () => {
  await fs.mkdir(DOWNLOAD_DIR, { recursive: true });
  const CONCURRENCY = 50;
  const total = urls.length;
  console.log(
    `Starting download of ${total} URLs with concurrency ${CONCURRENCY}...`,
  );

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        const fileName = new URL(url).pathname;
        const filePath = path.join(DOWNLOAD_DIR, fileName);

        try {
          const res = await fetch(url);
          if (!res.ok) {
            console.error(`Failed: ${url} (${res.status})`);
            return;
          }
          const text = await res.text();
          let formatted = text;
          try {
            const data = JSON.parse(text);
            formatted = JSON.stringify(data, null, 2);
          } catch (e) {
            console.warn(
              `Warning: Could not format JSON for ${url} (invalid JSON format). Saving raw response.`,
            );
          }
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, formatted);
          console.log(`Downloaded: ${url}`);
        } catch (error) {
          console.error(`Error downloading ${url}:`, error);
        }
      }),
    );
    console.log(`Progress: ${Math.min(i + CONCURRENCY, total)}/${total}`);
  }
  console.log("All downloads completed.");
};

const run = async () => {
  await downloadAllUrls();
};

// console.log(...(urls.map(i => i+"\n")))

run();

const keywords = ["6thstreet", "6th street", "6 street", "6ستريت", "6 ستريت"];

function removeUrls(str) {
  return str.replace(/https?:\/\/[^\s"'<>]+/gi, "");
}

function findReferences(value, path = "$", results = []) {
  if (typeof value === "string") {
    // skip pure URL
    if (/^https?:\/\//i.test(value)) return results;

    const text = removeUrls(value).toLowerCase();

    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        results.push({
          path,
          keyword,
          value,
        });
      }
    }

    return results;
  }

  if (Array.isArray(value)) {
    value.forEach((item, i) => findReferences(item, `${path}[${i}]`, results));
    return results;
  }

  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, val]) => {
      findReferences(val, `${path}.${key}`, results);
    });
  }

  return results;
}
const CONCURRENCY = 20;

async function processUrl(url) {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Failed: ${url} (${res.status})`);
      return;
    }

    const data = await res.json();
    const matches = findReferences(data);

    if (matches.length) {
      console.log("\n=================================================");
      console.log(url);

      matches.forEach((m) => {
        console.log(`Path    : ${m.path}`);
        console.log(`Keyword : ${m.keyword}`);
        console.log(`Value   : ${m.value}`);
        console.log("-------------------------------------------");
      });
    }
  } catch (err) {
    console.error(`Failed: ${url}`);
    console.error(err.message);
  }
}

const verifyAllTheJson = async () => {
  const total = urls.length;

  for (let i = 0; i < total; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(processUrl));

    console.log(`Progress: ${Math.min(i + CONCURRENCY, total)}/${total}`);
  }

  console.log("Done");
};

// verifyAllTheJson();

// node data_creation.js > report.txt 2>&1