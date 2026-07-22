<script>
    let { size = 40, class: className = '' } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 250 250"
    class={className}
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Stylised Rottnest Island outline"
    role="img"
>
    <defs>
        <filter id="rottnest-logo-shadow" class="rottnest-logo-shadow" x="-18%" y="-18%" width="136%" height="136%">
            <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#04343d" flood-opacity="0.28"/>
        </filter>
    </defs>
    <path
        class="rottnest-logo-badge"
        fill="#2fb8b1"
        filter="url(#rottnest-logo-shadow)"
        d="
            M 45,166
            C 62,148 96,138 135,140
            C 169,142 195,151 207,168
            C 191,162 168,158 139,158
            C 100,158 66,162 45,166 Z
        "
    />
    <path
        fill="#9fe3df"
        opacity="0.82"
        d="
            M 55,161
            C 75,148 104,143 136,144
            C 161,145 181,152 194,162
            C 176,158 155,156 132,156
            C 100,156 73,158 55,161 Z
        "
    />
    <g transform="translate(15 72) scale(0.44)">
        <path
            class="rottnest-silhouette"
            fill="#f8fbfb"
            d="
                M 32,168
                C 28,164 25,155 30,148
                C 36,142 45,145 52,143
                C 58,141 62,133 70,131
                C 78,129 83,135 91,130
                C 98,125 105,120 115,118
                C 122,116 128,103 138,98
                C 148,93 158,98 168,90
                C 178,82 188,72 201,65
                C 214,58 228,62 242,58
                C 255,54 266,42 282,45
                C 292,47 298,38 307,41
                C 313,43 318,52 326,50
                C 334,48 342,51 352,48
                C 362,45 372,50 382,50
                C 398,50 415,62 430,72
                C 445,82 458,92 472,100
                C 455,108 440,113 430,121
                C 422,127 418,136 411,142
                C 402,150 392,142 382,147
                C 372,152 363,165 352,172
                C 345,177 338,185 332,192
                C 328,197 322,208 314,210
                C 307,212 304,200 300,190
                C 294,178 285,171 274,166
                C 262,161 248,162 235,158
                C 222,155 210,165 196,165
                C 182,165 170,156 156,154
                C 142,152 132,163 118,160
                C 106,157 98,145 86,147
                C 76,149 68,157 58,163
                C 50,168 40,172 32,168 Z
            "
        />
    </g>
</svg>
