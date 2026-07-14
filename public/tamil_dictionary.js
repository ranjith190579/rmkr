const TamilDictionary = {

    words: {

        "manju": "மஞ்சு",
        "ranjith": "ரஞ்சித்",
        "velavan": "வேலவன்",
        "tenkasi": "தென்காசி",
        "manju": "மஞ்சு",
        "alangulam": "ஆலங்குளம்",
        "kavin":"கவின்",
        "rakshan":"ரக்ஷன்"

    },

    get(word) {

        word = word.toLowerCase().trim();

        return this.words[word] || null;

    }

};