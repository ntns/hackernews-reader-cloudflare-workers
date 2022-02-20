export const onRequest = async ({ env }) => {
    return await getStories()
}

const API_URL = "https://hnrss.org/frontpage.jsonfeed?count=100"

async function getStories() {
    const init = {
        headers: {
            "content-type": "application/json;charset=UTF-8",
        },
    }
    const apiResponse = await fetch(API_URL, init)
    const stories = JSON.stringify(await apiResponse.json())
    const response = new Response(stories, init)
    response.headers.append("Cache-Control", "maxage=30")
    return response
}
