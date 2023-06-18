import fetch from "node-fetch";
import http from "http";
import url from "url";
import path from "path";

const server = http.createServer((request, response) => {
    const { query, pathname } = url.parse(request.url, true);
    console.log(pathname);
    console.log(query.CUR);

    if (pathname === "/products") {
        const products = async () => {
            try {
                const [productsResponse, exchangeRateResponse] = await Promise.all([
                    fetch("https://api.escuelajs.co/api/v1/products?offset=1&limit=3"),
                    fetch(`https://api.exchangerate.host/convert?from=USD&to=${query.CUR}`),
                ]);

                if (!productsResponse.ok || !exchangeRateResponse.ok) {
                    throw new Error("Unable to fetch data from API");
                }

                const productsData = await productsResponse.json();
                const exchangeRateData = await exchangeRateResponse.json();

                const conversionRate = exchangeRateData.result;

                const transformedProducts = productsData.reduce((acc, product) => {
                    if (!acc[product.category?.id]) {
                        acc[product.category?.id] = {
                            category: {
                                id: product.category?.id,
                                name: product.category?.name,
                            },
                            products: [],
                        };
                    }

                    const transformedProduct = {
                        ...product,
                        price: product.price * conversionRate,
                    };
                    acc[product.category?.id].products.push(transformedProduct);

                    return acc;
                }, {});

                response.end(JSON.stringify(Object.values(transformedProducts), null, 2));
            } catch (error) {
                console.log(error);
            }
        };

        products();
    } else {
        response.end("Error!");
    }
});

server.listen(8080, "127.0.0.1", () => {
    console.log("Converting from USD ...");
});
