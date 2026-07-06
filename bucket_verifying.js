const { generateCombinations } = require("./index");

const CONCURRENCY = 50;

const data_set = [
  {
    "name": "app_cms_shipping",
    "variant_stage": "/app_cms/${country_code}/shipping.json",
    "variant_prod": "/app_cms/${country_code}/shipping.json"
  },
  {
    "name": "cms_return",
    "variant_stage": "/app_cms/return.json",
    "variant_prod": "/app_cms/return.json"
  },
  {
    "name": "app_cms_security",
    "variant_stage": "/app_cms/security.json",
    "variant_prod": "/app_cms/security.json"
  },
  {
    "name": "mega_menu_brands",
    "variant_stage": "/brands/data_stg/mega_menu_brands_2024-03-11.json",
    "variant_prod": "/brands/data_prd/mega_menu_brands_2024-03-11.json"
  },
  {
    "name": "bottom_tab_msite",
    "variant_stage": "/config_staging/bottom_tab_msite.json",
    "variant_prod": "/config/bottom_tab_msite.json"
  },
  {
    "name": "brand_logos",
    "variant_stage": "/config_staging/brand_logos.json",
    "variant_prod": "/config/brand_logos.json"
  },
  {
    "name": "ca_learn_more",
    "variant_stage": "/config_staging/CaLearnMore.json",
    "variant_prod": "/config/CaLearnMore.json"
  },
  {
    "name": "wallet_faq",
    "variant_stage": "/config_staging/faq.json",
    "variant_prod": "/config/faq.json"
  },
  {
    "name": "home_json",
    "variant_stage": "/config_staging/homepage/${device-type}/home.json ",
    "variant_prod": "/config/homepage/${device-type}/home.json "
  },
  {
    "name": "my_account_menu",
    "variant_stage": "/config_staging/rebrand/my_account_menu.json",
    "variant_prod": "/config/rebrand/my_account_menu.json"
  },
  {
    "name": "our_program",
    "variant_stage": "/config_staging/rebrand/our_program.json",
    "variant_prod": "/config/rebrand/our_program.json"
  },
  {
    "name": "pdp_json",
    "variant_stage": "/config_staging/rebrand/pdp/stg/${locale}.json ",
    "variant_prod": "/config/rebrand/pdp/${locale}.json "
  },
  {
    "name": "tier_benefit",
    "variant_stage": "/config_staging/rebrand/tier-benefits/${locale}.json",
    "variant_prod": "/config/rebrand/tier-benefits/${locale}.json"
  },
  {
    "name": "trust_social_proof",
    "variant_stage": "/config_staging/rebrand/trustAndSocialProofContent.json",
    "variant_prod": "/config/rebrand/trustAndSocialProofContent.json"
  },
  {
    "name": "club_apparel_info",
    "variant_stage": "/config_staging/v1/clubApparelInfo/${locale}.json ",
    "variant_prod": "/config/v1/clubApparelInfo/${locale}.json"
  }
];

const processedData = data_set.map((item) => {
  const urlVariants = generateCombinations(item.variant_stage);
  const urlVariantsProd = generateCombinations(item.variant_prod);
  return {
    name: item.name,
    url_variants: urlVariants,
    url_variants_prod: urlVariantsProd,
  };
});

const data = [];

processedData.map((item) => {
  item.url_variants.map((url) => {
    data.push(url.str);
  });
  item.url_variants_prod.map((url) => {
    data.push(url.str);
  });
});

const domains = {
  main: "https://mobilecdn.6thstreet.com",
  new: "https://config.aivi.com",
};

const results = [];

async function check(domain, path) {
  try {
    const res = await fetch(domain + path);

    return {
      pass: res.ok,
      code: res.status,
    };
  } catch (err) {
    return {
      pass: false,
      code: err.code || err.message,
    };
  }
}

async function processPath(path) {
  const [main, next] = await Promise.all([
    check(domains.main, path),
    check(domains.new, path),
  ]);

  results.push({
    path,
    main: main.pass ? "PASS" : "FAIL",
    new: next.pass ? "PASS" : "FAIL",
    code: `${main.code}, ${next.code}`,
  });
}

async function run() {
  for (let i = 0; i < data.length; i += CONCURRENCY) {
    const batch = data.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(processPath));

    console.log(
      `Done ${Math.min(i + CONCURRENCY, data.length)}/${data.length}`,
    );
  }

  results.sort((a, b) => (a.main === "PASS" || b.main === "FAIL" ? -1 : 1));
  console.table(results);

  console.log("\nFailed both:");
  console.table(results.filter((r) => r.main === "FAIL" || r.new === "FAIL"));
}

run();
