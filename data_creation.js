const { generateCombinations } = require("./index");

const data =[
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
    "variant_prod": "/config/v1/clubApparelInfo/${locale}.json "
  },
  {
    "name": "aivi_onboarding_data",
    "variant_stage": "/config_staging/v1/default.json",
    "variant_prod": "/config/v1/default.json"
  },
  {
    "name": "aivi_onboarding_brands",
    "variant_stage": "/config_staging/v1/default.json",
    "variant_prod": "/config/v1/default.json"
  },
  {
    "name": "unified_faqs",
    "variant_stage": "/config_staging/v1/unified_faqs.json",
    "variant_prod": "/config/v1/unified_faqs.json"
  },
  {
    "name": "unified_terms_and_conditions",
    "variant_stage": "/config_staging/v1/unified_terms_and_conditions.json",
    "variant_prod": "/config/v1/unified_terms_and_conditions.json"
  },
  {
    "name": "ab_testing_config",
    "variant_stage": "/config_staging/v2/abtestConfig.json",
    "variant_prod": "/config/v2/abtestConfig.json"
  },
  {
    "name": "verticals",
    "variant_stage": "/config_staging/verticals_data/${country_code}/verticals.json ",
    "variant_prod": "/config/verticals_data/${country_code}/verticals.json "
  },
  {
    "name": "trending_search",
    "variant_stage": "/resources/20191010_staging/${country-code}/search/v1/trending_${men,women,kids,all}.json",
    "variant_prod": "/resources/20190121/${country-code}/search/v1/trending_women.json"
  },
  {
    "name": "plp",
    "variant_stage": "/resources/20191010_staging/${locale}/${device-type}/${men,women,kids,home}_plp.json",
    "variant_prod": "/resources/20190121/${locale}/${device-type}/${men,women,kids,all}_plp.json"
  },
  {
    "name": "shop_by_brand",
    "variant_stage": "/resources/20191010_staging/${locale}/${device-type}/${men,women,kids,all}_shop_by_brand.json",
    "variant_prod": "/resources/20190121/${locale}/${device-type}/${men,women,kids,all}_shop_by_brand.json"
  },
  {
    "name": "store_page_user_segement",
    "variant_stage": "/resources/20191010_staging/${locale}/${device-type}/${user_segment}_store_page.json",
    "variant_prod": "/resources/20190121/${locale}/${device-type}/${user_segment}_store_page.json"
  },
  {
    "name": "not_found",
    "variant_stage": "/resources/20191010_staging/${locale}/${device-type}/not_found.json",
    "variant_prod": "/resources/20190121/${locale}/${device-type}/not_found.json"
  },
  {
    "name": "brands_custom_screens",
    "variant_stage": "/resources/20191010_staging/${locale}/brands_custom_screens.json",
    "variant_prod": "/resources/20190121/${locale}/brands_custom_screens.json"
  },
  {
    "name": "categories_custom_categories",
    "variant_stage": "/resources/20191010_staging/${locale}/categories_custom_categories.json",
    "variant_prod": "/resources/20190121/${locale}/categories_custom_categories.json"
  },
  {
    "name": "influencers",
    "variant_stage": "/resources/20191010_staging/${locale}/collections/influencers.json",
    "variant_prod": "/resources/20190121/${locale}/collections/influencers.json"
  },
  {
    "name": "home_custom_categories",
    "variant_stage": "/resources/20191010_staging/${locale}/home_custom_categories.json",
    "variant_prod": "/resources/20190121/${locale}/home_custom_categories.json"
  },
  {
    "name": "Notification Tab",
    "variant_stage": "/resources/20191010_staging/${locale}/notification_tab ",
    "variant_prod": "/resources/20191010_staging/${locale}/notification_tab "
  },
  {
    "name": "pdp_json",
    "variant_stage": "/resources/20191010_staging/${locale}/pdp.json",
    "variant_prod": "/resources/20190121/${locale}/pdp.json"
  },
  {
    "name": "plp_meta",
    "variant_stage": "/resources/20191010_staging/${locale}/plp_meta.json",
    "variant_prod": "/resources/20190121/${locale}/plp_meta.json"
  },
  {
    "name": "search_trending_brands",
    "variant_stage": "/resources/20191010_staging/${locale}/search_trending_brands.json",
    "variant_prod": "/resources/20190121/${locale}/search_trending_brands.json"
  },
  {
    "name": "search_trending_tags.json",
    "variant_stage": "/resources/20191010_staging/${locale}/search_trending_tags.json",
    "variant_prod": "/resources/20190121/${locale}/search_trending_tags.json"
  },
  {
    "name": "search_suggestion",
    "variant_stage": "/resources/20191010_staging/${locale}/search/search_${men,women,kids,all}.json",
    "variant_prod": " /resources/20190121/${locale}/search/search_${men,women,kids,all}.json"
  },
  {
    "name": "search_v1_suggestion ",
    "variant_stage": "/resources/20191010_staging/${locale}/search/v1/search_${men,women,kids}.json ",
    "variant_prod": "/resources/20190121/${locale}/search/v1/search_${men,women,kids}.json "
  },
  {
    "name": "about_page",
    "variant_stage": "/resources/20191010_staging/pages/aboutpage.json",
    "variant_prod": "/resources/20190121/pages/aboutpage.json"
  },
  {
    "name": "PLP Footer",
    "variant_stage": "/resources/20191010_staging/pages/plp_footer_${women,men,kids,home}.json",
    "variant_prod": "/resources/20190121/pages/plp_footer_${women,men,kids,home}.json"
  },
  {
    "name": "vip_page",
    "variant_stage": "/resources/20191010_staging/pages/vip_page.json",
    "variant_prod": "/resources/20190121/pages/vip_page.json"
  },
  {
    "name": "vip_screen_app",
    "variant_stage": "/resources/20191010_staging/pages/vip_screen_app.json",
    "variant_prod": "/resources/20190121/pages/vip_screen_app.json"
  }
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

processedData.map((item) => {
  item.url_variants.map((url) => {
    console.log(`"${url.str}",`);
  });
  item.url_variants_prod.map((url) => {
    console.log(`"${url.str}",`);
  });
});
