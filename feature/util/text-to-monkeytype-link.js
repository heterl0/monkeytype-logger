// Example Encoded Monkeytype Setting:
// var uri = "NoIgxgrgzgLg9gWxAGnNeTkG8QLgEwFMQAuEKACwgDNqAbY1ABwEsnCARQulhFmQgCdS1AIZ0ohVDz4xSOPEVIgA7nEH4UIAG7iIxEgEYADAF9UAgB5ySoACqFYWgU9QUWzikOIBdc2IkpAMlkADsIOjpUUPUEcRRwyJ8gA"
// let decompressed = LZString.decompressFromEncodedURIComponent(uri)
// use LZString.compressToEncodedURIComponent, otherwise it will not work

export const getMonkeytypeLink = (words) => {
    const settings_plain = JSON.stringify(

        [
            "custom",
            "custom",
            {
                "mode": "shuffle",
                "pipeDelimiter": false,
                "limit": {
                    "mode": "word",
                    "value": 10
                },
                "text":
                words
            },
            false,
            false,
            null,
            "normal",
            null
        ]);

    const settings_compressed = LZString.compressToEncodedURIComponent(settings_plain)
    return "https://monkeytype.com/?testSettings=" + settings_compressed
};

