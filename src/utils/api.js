// src/utils/api.js
const GAS_URL = "https://script.google.com/macros/s/AKfycbw7jGvpY2DU5dPdSdkXMcL4Mnf0jZIcKfMYEJOkIiDIm7qoMkGid-upq1AJ3mVRP9Il/exec";

export async function fetchProducts() {
  try {
    const response = await fetch(GAS_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return {
      products: data.products || [],
      config: data.config || { solid_tags: "" }
    };
  } catch (error) {
    console.error("Fetch API Error:", error);
    return { products: [], config: { solid_tags: "" }, error: true };
  }
}
