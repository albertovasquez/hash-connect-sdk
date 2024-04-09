export const parseJwt = (token: string) => {
    var base64Url = token.split(".")[1];
    var base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    var jsonPayload = decodeURIComponent(
        window
            .atob(base64)
            .split("")
            .map(function (c) {
                return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join("")
    );

    return JSON.parse(jsonPayload);
};

export const isExpired = (token: string) => {
    const { exp } = parseJwt(token);

    // console when expires
    // print in minutes when expires from now
    console.log("expires in", (exp * 1000 - Date.now()) / 1000 / 60, "minutes");

    return Date.now() >= exp * 1000;
};
