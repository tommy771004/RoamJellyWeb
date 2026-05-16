<!-- Jelly Map -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<title>RoamJelly - Jelly Map Mode</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-primary-fixed": "#360b1e",
                        "tertiary-fixed-dim": "#9accf3",
                        "error": "#ba1a1a",
                        "on-tertiary-fixed-variant": "#0c4b6c",
                        "tertiary": "#2e6385",
                        "tertiary-fixed": "#c9e6ff",
                        "primary-fixed-dim": "#fab3ca",
                        "on-surface": "#1a1c1c",
                        "surface-container-low": "#f3f3f4",
                        "inverse-surface": "#2f3131",
                        "surface-bright": "#f9f9f9",
                        "secondary-fixed": "#b2f2bb",
                        "secondary-fixed-dim": "#96d5a0",
                        "secondary-container": "#b2f2bb",
                        "on-secondary-fixed-variant": "#145129",
                        "inverse-on-surface": "#f0f1f1",
                        "surface-tint": "#864d61",
                        "surface-dim": "#dadada",
                        "surface-variant": "#e2e2e2",
                        "inverse-primary": "#fab3ca",
                        "background": "#f9f9f9",
                        "on-primary-fixed-variant": "#6a364a",
                        "tertiary-container": "#9ed1f8",
                        "surface": "#f9f9f9",
                        "primary": "#864d61",
                        "surface-container": "#eeeeee",
                        "on-background": "#1a1c1c",
                        "on-secondary": "#ffffff",
                        "on-primary-container": "#7b4458",
                        "on-primary": "#ffffff",
                        "on-surface-variant": "#514347",
                        "outline-variant": "#d5c2c6",
                        "on-error-container": "#93000a",
                        "surface-container-highest": "#e2e2e2",
                        "on-tertiary": "#ffffff",
                        "error-container": "#ffdad6",
                        "primary-fixed": "#ffd9e3",
                        "on-error": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "on-tertiary-fixed": "#001e2f",
                        "on-secondary-fixed": "#00210b",
                        "primary-container": "#ffb7ce",
                        "secondary": "#2f6a3f",
                        "on-tertiary-container": "#235a7c",
                        "on-secondary-container": "#357044",
                        "surface-container-high": "#e8e8e8",
                        "outline": "#837377"
                    },
                    "borderRadius": {
                        "DEFAULT": "1rem",
                        "lg": "2rem",
                        "xl": "3rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "16px",
                        "md": "20px",
                        "xl": "48px",
                        "container-padding": "24px",
                        "lg": "32px",
                        "sm": "12px",
                        "base": "8px",
                        "xs": "4px"
                    },
                    "fontFamily": {
                        "h2": ["Plus Jakarta Sans"],
                        "h1": ["Plus Jakarta Sans"],
                        "body-lg": ["Be Vietnam Pro"],
                        "body-md": ["Be Vietnam Pro"],
                        "label-caps": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "h2": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
                        "h1": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }],
                        "label-caps": ["12px", { "lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "700" }]
                    }
                }
            }
        }
    </script>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.fill {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        
        /* Map background simulation */
        .map-bg {
            background-color: #fce4ec; /* light pink base */
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.6) 0%, transparent 40%),
                radial-gradient(circle at 80% 70%, rgba(255, 228, 230, 0.8) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(251, 207, 232, 0.4) 0%, transparent 60%);
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: -1;
        }

        /* Connecting magic lines */
        .magic-line-1 {
            position: absolute;
            top: 40%;
            left: 30%;
            width: 40%;
            height: 20%;
            border-top: 3px dashed rgba(255, 183, 206, 0.8);
            border-radius: 50% 50% 0 0;
            transform: rotate(-15deg);
            filter: drop-shadow(0 0 8px rgba(255, 183, 206, 0.6));
            z-index: 0;
        }
        .magic-line-2 {
            position: absolute;
            top: 55%;
            left: 65%;
            width: 20%;
            height: 30%;
            border-left: 3px dashed rgba(158, 209, 248, 0.8);
            border-radius: 50% 0 0 50%;
            transform: rotate(20deg);
            filter: drop-shadow(0 0 8px rgba(158, 209, 248, 0.6));
            z-index: 0;
        }

        /* Glassmorphism utilities */
        .glass-panel {
            background: rgba(255, 255, 255, 0.4);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-top: 1.5px solid rgba(255, 255, 255, 0.5);
            border-left: 1.5px solid rgba(255, 255, 255, 0.5);
            box-shadow: inset 0 2px 10px rgba(255, 255, 255, 0.8), 0 8px 32px rgba(134, 77, 97, 0.1);
        }
        
        .glass-node {
            background: rgba(255, 255, 255, 0.6);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.8);
            box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.9), 0 4px 12px rgba(134, 77, 97, 0.15);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-surface antialiased min-h-screen overflow-hidden selection:bg-primary-container selection:text-on-primary-container">
<!-- Map Background Area -->
<div class="map-bg"></div>
<img alt="Map background" class="w-full h-full object-cover fixed top-0 left-0 mix-blend-overlay opacity-30 z-[-1]" data-alt="Soft pastel colored illustrated map showing abstract city layout with gentle curves and ethereal lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZHxvLbD5q4rEIsGbsiRCKMNlNvrhWVBk3kjPT-MTNIBGql6X2y6EoaQ8Zx0q-18kuO3Ewy1HMoxI73fBRvBMPBdxXspdZ6RMlwpnmTFRx9K8Jopt0hnVRBGrMvyu4VsjrM-m7dkbOiTylotnK33R8k0xIw-TMT4L3uTmOuLHUL1Rt2Ea4bdyBOt59-TKc7_c0o066EEDGDD8eVxG8Z-tKZDlaVRmNoog0S16XHzqMlnQWCpmXBfyNl1oA93FF1TF4m4-Whv6vsnzZ"/>
<!-- Magic Paths -->
<div class="magic-line-1"></div>
<div class="magic-line-2"></div>
<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/30 dark:bg-pink-900/20 backdrop-blur-2xl rounded-b-[40px] border-b border-l border-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)]">
<div class="flex items-center gap-sm">
<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 shadow-sm">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="Close up portrait of a young woman with soft natural makeup in warm lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDvNXbe8LctabV2yG-v6GfZ78VVKInQXEC4F2CmENqJ2ydgFiRgNxXHdGRCSfrTX3IWN2fY5T7fzmBqjr7n9ptrn0Hc3nJibeST8EciMURH2FwXcFsPdGk_C16EPKDpJHexrklZIpyUAcPqtexyN62gvdFAidFqmoab9UdVpjLIrpHTKENJiJypxoPgwkdgU90K87mVFCgCz7xR0L37VK7OLABTTN88P9sOhMra_uSgX8g7KctXCuT7vXMIk1AoDns32IWIX3m8HaY"/>
</div>
</div>
<div class="text-2xl font-black text-pink-500 italic font-plus-jakarta text-lg font-bold tracking-tight">RoamJelly</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 text-pink-400 dark:text-pink-200 hover:scale-105 transition-transform">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
</header>
<!-- Main Content Canvas (Map Layer) -->
<main class="relative w-full h-screen pt-24 pb-32">
<!-- Map Nodes -->
<!-- Node 1: Cafe -->
<div class="absolute top-[25%] left-[20%] group">
<div class="glass-node w-14 h-14 rounded-full flex items-center justify-center text-2xl relative z-10 hover:scale-110 transition-transform cursor-pointer">
                ☕️
                <div class="absolute -inset-2 bg-pink-300/20 rounded-full blur-md -z-10 group-hover:bg-pink-300/40 transition-colors"></div>
</div>
<div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-panel px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
<p class="font-body-md text-sm font-semibold text-on-surface">Cloud Cafe</p>
</div>
</div>
<!-- Node 2: Park (Active/Focus) -->
<div class="absolute top-[45%] left-[65%] group z-20">
<div class="glass-node w-16 h-16 rounded-full flex items-center justify-center text-3xl relative z-10 scale-110 shadow-[0_0_20px_rgba(255,183,206,0.6)] cursor-pointer">
                🌸
                <div class="absolute -inset-3 bg-primary-container/40 rounded-full blur-lg -z-10 animate-pulse"></div>
</div>
<div class="absolute top-full left-1/2 -translate-x-1/2 mt-3 glass-panel px-4 py-2 rounded-xl whitespace-nowrap pointer-events-none">
<p class="font-body-md text-base font-bold text-primary">Zen Gardens</p>
<p class="font-body-md text-xs text-on-surface-variant text-center">2 mins away</p>
</div>
</div>
<!-- Node 3: Viewpoint -->
<div class="absolute top-[70%] left-[35%] group">
<div class="glass-node w-12 h-12 rounded-full flex items-center justify-center text-xl relative z-10 hover:scale-110 transition-transform cursor-pointer">
                ✨
                <div class="absolute -inset-2 bg-tertiary-container/30 rounded-full blur-md -z-10 group-hover:bg-tertiary-container/50 transition-colors"></div>
</div>
<div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 glass-panel px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
<p class="font-body-md text-sm font-semibold text-on-surface">Star Hill</p>
</div>
</div>
<!-- Floating Action Button (Filter) -->
<div class="absolute bottom-32 right-6 z-30">
<button class="glass-node w-14 h-14 rounded-[20px] flex items-center justify-center text-primary shadow-lg hover:scale-105 active:scale-95 transition-all">
<span class="material-symbols-outlined fill text-2xl" data-icon="tune">tune</span>
</button>
</div>
<!-- Location Pill -->
<div class="absolute top-28 left-1/2 -translate-x-1/2 z-30">
<div class="glass-panel px-5 py-2 rounded-full flex items-center gap-xs">
<span class="material-symbols-outlined text-primary text-sm" data-icon="near_me">near_me</span>
<span class="font-body-md text-sm font-medium text-on-surface">Kyoto, Japan</span>
</div>
</div>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-8 bg-white/40 dark:bg-slate-900/30 backdrop-blur-3xl rounded-[40px] m-6 border border-white/60 border-t border-l border-white/40 shadow-2xl w-[calc(100%-48px)] md:hidden">
<button class="flex flex-col items-center justify-center w-16 h-16 relative group">
<div class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl text-pink-500" data-icon="home">home</span>
</div>
</button>
<button class="flex flex-col items-center justify-center w-16 h-16 relative group">
<div class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl text-pink-500" data-icon="calendar_month">calendar_month</span>
</div>
</button>
<button class="flex flex-col items-center justify-center w-16 h-16 relative group">
<div class="bg-white/60 shadow-[0_0_20px_rgba(255,183,206,0.6)] rounded-full p-3 scale-110 transition-all">
<span class="material-symbols-outlined text-2xl text-pink-500 fill" data-icon="map">map</span>
</div>
</button>
<button class="flex flex-col items-center justify-center w-16 h-16 relative group">
<div class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl text-pink-500" data-icon="backpack">backpack</span>
</div>
</button>
<button class="flex flex-col items-center justify-center w-16 h-16 relative group">
<div class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl text-pink-500" data-icon="account_balance_wallet">account_balance_wallet</span>
</div>
</button>
</nav>
<!-- Desktop Side Nav Overlay (Hidden on Mobile) -->
<nav class="hidden md:flex flex-col fixed left-6 top-1/2 -translate-y-1/2 z-50 glass-panel rounded-[32px] p-4 gap-4 w-20 items-center shadow-2xl">
<button class="w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-white/40 transition-colors">
<span class="material-symbols-outlined" data-icon="home">home</span>
</button>
<button class="w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-white/40 transition-colors">
<span class="material-symbols-outlined" data-icon="calendar_month">calendar_month</span>
</button>
<button class="w-12 h-12 rounded-xl flex items-center justify-center bg-white/60 text-primary shadow-[0_0_15px_rgba(255,183,206,0.4)] scale-110 transition-all">
<span class="material-symbols-outlined fill" data-icon="map">map</span>
</button>
<button class="w-12 h-12 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-white/40 transition-colors">
<span class="material-symbols-outlined" data-icon="backpack">backpack</span>
</button>
</nav>
</body></html>

<!-- Jelly Planner -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>RoamJelly - Itinerary Planner</title>
<!-- Google Fonts & Material Symbols -->
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,800&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<!-- Tailwind CSS -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<!-- Theme Configuration -->
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-primary-fixed": "#360b1e",
                        "tertiary-fixed-dim": "#9accf3",
                        "error": "#ba1a1a",
                        "on-tertiary-fixed-variant": "#0c4b6c",
                        "tertiary": "#2e6385",
                        "tertiary-fixed": "#c9e6ff",
                        "primary-fixed-dim": "#fab3ca",
                        "on-surface": "#1a1c1c",
                        "surface-container-low": "#f3f3f4",
                        "inverse-surface": "#2f3131",
                        "surface-bright": "#f9f9f9",
                        "secondary-fixed": "#b2f2bb",
                        "secondary-fixed-dim": "#96d5a0",
                        "secondary-container": "#b2f2bb",
                        "on-secondary-fixed-variant": "#145129",
                        "inverse-on-surface": "#f0f1f1",
                        "surface-tint": "#864d61",
                        "surface-dim": "#dadada",
                        "surface-variant": "#e2e2e2",
                        "inverse-primary": "#fab3ca",
                        "background": "#f9f9f9",
                        "on-primary-fixed-variant": "#6a364a",
                        "tertiary-container": "#9ed1f8",
                        "surface": "#f9f9f9",
                        "primary": "#864d61",
                        "surface-container": "#eeeeee",
                        "on-background": "#1a1c1c",
                        "on-secondary": "#ffffff",
                        "on-primary-container": "#7b4458",
                        "on-primary": "#ffffff",
                        "on-surface-variant": "#514347",
                        "outline-variant": "#d5c2c6",
                        "on-error-container": "#93000a",
                        "surface-container-highest": "#e2e2e2",
                        "on-tertiary": "#ffffff",
                        "error-container": "#ffdad6",
                        "primary-fixed": "#ffd9e3",
                        "on-error": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "on-tertiary-fixed": "#001e2f",
                        "on-secondary-fixed": "#00210b",
                        "primary-container": "#ffb7ce",
                        "secondary": "#2f6a3f",
                        "on-tertiary-container": "#235a7c",
                        "on-secondary-container": "#357044",
                        "surface-container-high": "#e8e8e8",
                        "outline": "#837377"
                    },
                    "borderRadius": {
                        "DEFAULT": "1rem",
                        "lg": "2rem",
                        "xl": "3rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "16px",
                        "md": "20px",
                        "xl": "48px",
                        "container-padding": "24px",
                        "lg": "32px",
                        "sm": "12px",
                        "base": "8px",
                        "xs": "4px"
                    },
                    "fontFamily": {
                        "h2": ["Plus Jakarta Sans"],
                        "h1": ["Plus Jakarta Sans"],
                        "body-lg": ["Be Vietnam Pro"],
                        "body-md": ["Be Vietnam Pro"],
                        "label-caps": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "h2": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
                        "h1": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }],
                        "label-caps": ["12px", { "lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "700" }]
                    }
                }
            }
        }
    </script>
<style>
        /* Extreme Glassmorphism Base Styles */
        .jelly-bg {
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(250, 179, 202, 0.4) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(201, 230, 255, 0.5) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(178, 242, 187, 0.3) 0%, transparent 50%);
            background-color: theme('colors.surface');
            background-attachment: fixed;
        }
        
        .jelly-surface {
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-top: 1.5px solid rgba(255, 255, 255, 0.5);
            border-left: 1.5px solid rgba(255, 255, 255, 0.5);
            box-shadow: inset 0 2px 10px rgba(255, 255, 255, 0.8), 0 8px 32px rgba(134, 77, 97, 0.05);
        }

        .jelly-button {
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border-top: 1.5px solid rgba(255, 255, 255, 0.7);
            border-left: 1.5px solid rgba(255, 255, 255, 0.7);
            box-shadow: inset 0 2px 10px rgba(255, 255, 255, 0.9), 0 4px 15px rgba(134, 77, 97, 0.1);
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .jelly-button:active {
            transform: scale(0.95);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
        }

        .timeline-line {
            background: linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
            box-shadow: 0 0 15px rgba(255, 183, 206, 0.6);
        }

        /* Material Icons Base */
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="jelly-bg min-h-screen text-on-surface font-body-md text-body-md overflow-x-hidden selection:bg-primary-container selection:text-on-primary-container">
<!-- TopAppBar (Shared Component) -->
<header class="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/30 backdrop-blur-2xl rounded-b-[40px] border-b border-l border-white/50 backdrop-blur-[25px] shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)]">
<!-- Leading: Avatar -->
<div class="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white/60 shadow-[0_2px_8px_rgba(134,77,97,0.15)]">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="close up portrait of a young woman with soft natural lighting and pastel background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFfGveNVXpC_CjFlJJ3M-fdH90I7uRRfVFWQV3dOUaS6bVf44X_er8rlls_Gf8D1yTDGyjGaD_jCH0ENDMqDaJKrszVzslF1LhrmEHrXlH4QLgUTWp0z8pGw13SrX_KIDy8TFY-wGFu-RElrhGpOLhBhVD1JbI82y8uaP7yp6A5Pz8vzKqNlGeUhQQBW3YvcmJ0gwdyLy1DPzHBGmhntoUTOFsF_Z5GQDbJzGlnQxR35FDDorkz50crD_ZM0jCx0cdEJ_HxELCVV5p"/>
</div>
<!-- Headline -->
<h1 class="text-2xl font-black text-pink-500 italic tracking-tight font-plus-jakarta">RoamJelly</h1>
<!-- Trailing: Icon -->
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 jelly-button text-pink-400">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="pt-[100px] pb-[140px] px-container-padding max-w-2xl mx-auto relative">
<!-- Page Header & Collaboration Area -->
<div class="flex items-end justify-between mb-xl">
<div>
<h2 class="font-h1 text-h1 text-on-surface mb-xs">Kyoto Trip 🌸</h2>
<p class="font-body-lg text-body-lg text-on-surface-variant opacity-80 mb-md">Day 1 • April 12</p>
<!-- Collaboration Avatars with Breathing Light Effect (Static Glow) -->
<div class="flex -space-x-sm items-center">
<img alt="Friend 1" class="w-10 h-10 rounded-full border-2 border-white/80 shadow-[0_0_15px_rgba(255,183,206,0.8)] object-cover relative z-30" data-alt="portrait of a young woman smiling with soft sunlight and blurred background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVUuv-Z2-bZqhzYGzJ2z8v1f4LeuploaSwjap7Ko7hG4NaYhb0nsYilj7pFOK9kDjn6hUCVEuOdicV_4yBd423wAEY0FXNsDUUNftxT39mZjAUjFAF2z7a4_OFS5pAVlgfsfSqYg_0ClzmyowjTBPpN2XmXUIBGnTooklOg0FXSIZnXMzbWTitqG3yFwI6CBCvnnDKDl3ZlHzlAJU16TU5o0QzlPQoQaKbBimVVwoAzDifFMfsMJiXLvJmugUpy6IV7Y7BVhzq8aSv"/>
<img alt="Friend 2" class="w-10 h-10 rounded-full border-2 border-white/80 shadow-[0_0_12px_rgba(201,230,255,0.7)] object-cover relative z-20" data-alt="close up of a person looking thoughtful in bright airy lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCZvKiacO3hF70fy5eESmH_Ahgoq-xwwIofk6vz21741LDAorqbODhPv73u3PA2eOQ03178KQvU55uf1ehzebUgdoqwq3SmlH8SJLlE7zWSnugAgTKaxvChAqV0Cs-NL7Setmv8mdu-4kchqA-hKJj-_r1dCKdoQKJPg4c1qpAAxHqvdmbUdZwwwqWcCsYC_c5qYq5Gh4KL7Ku7hP5OZ74gSlrUKVdp7IR1dFW2jpuMfL7ixaDSEPIM7kmOQquLM5so_lBxMZafUKLC"/>
<div class="w-10 h-10 rounded-full border-2 border-white/80 shadow-[0_0_10px_rgba(178,242,187,0.6)] bg-white/50 backdrop-blur-md flex items-center justify-center relative z-10 text-primary font-label-caps text-label-caps">
                        +2
                    </div>
</div>
</div>
<!-- Export to IG Stories Button -->
<button class="jelly-button bg-gradient-to-br from-primary-container to-tertiary-container text-on-primary-container px-gutter py-sm rounded-full flex items-center gap-xs font-label-caps text-label-caps tracking-widest shadow-[0_8px_20px_rgba(255,183,206,0.4)]">
<span class="material-symbols-outlined text-[16px]">camera_alt</span>
                STORY
            </button>
</div>
<!-- Itinerary Timeline -->
<div class="relative">
<!-- Glowing Vertical Line -->
<div class="absolute left-[27px] top-4 bottom-4 w-[4px] timeline-line rounded-full z-0"></div>
<!-- Cards Container -->
<div class="flex flex-col gap-lg relative z-10">
<!-- Card 1 -->
<div class="relative pl-xl flex items-center gap-gutter group">
<!-- Timeline Node -->
<div class="absolute left-[21px] w-4 h-4 rounded-full bg-white border-2 border-primary-container shadow-[0_0_12px_rgba(255,183,206,1)] z-20"></div>
<!-- Glassmorphic Sticker Card -->
<div class="flex-1 jelly-surface bg-white/40 rounded-xl p-gutter flex items-center gap-md rotate-[-1deg] hover:bg-white/50 transition-colors">
<div class="text-[32px] drop-shadow-md">✈️</div>
<div class="flex-1">
<h3 class="font-h2 text-[18px] text-on-surface leading-tight mb-1">KIX Airport Arrival</h3>
<div class="flex items-center gap-xs font-label-caps text-label-caps text-tertiary">
<span class="material-symbols-outlined text-[14px]">schedule</span>
                                10:30 AM
                            </div>
</div>
<span class="material-symbols-outlined text-outline-variant opacity-40 cursor-grab">drag_indicator</span>
</div>
</div>
<!-- Card 2 -->
<div class="relative pl-xl flex items-center gap-gutter group">
<div class="absolute left-[21px] w-4 h-4 rounded-full bg-white border-2 border-tertiary-container shadow-[0_0_12px_rgba(158,209,248,1)] z-20"></div>
<div class="flex-1 jelly-surface bg-white/40 rounded-xl p-gutter flex items-center gap-md rotate-[1deg] hover:bg-white/50 transition-colors">
<div class="text-[32px] drop-shadow-md">🚄</div>
<div class="flex-1">
<h3 class="font-h2 text-[18px] text-on-surface leading-tight mb-1">Haruka Express to City</h3>
<div class="flex items-center gap-xs font-label-caps text-label-caps text-tertiary">
<span class="material-symbols-outlined text-[14px]">schedule</span>
                                11:45 AM
                            </div>
</div>
<span class="material-symbols-outlined text-outline-variant opacity-40 cursor-grab">drag_indicator</span>
</div>
</div>
<!-- Card 3 (Active/Highlight State) -->
<div class="relative pl-xl flex items-center gap-gutter group">
<div class="absolute left-[19px] w-5 h-5 rounded-full bg-primary-container border-2 border-white shadow-[0_0_15px_rgba(255,183,206,1)] z-20"></div>
<div class="flex-1 jelly-surface bg-primary-fixed/30 rounded-xl p-gutter flex items-center gap-md shadow-[inset_0_2px_15px_rgba(255,255,255,0.9),_0_8px_20px_rgba(255,183,206,0.3)] border-white/80 scale-[1.02] origin-left">
<div class="text-[32px] drop-shadow-md">🍱</div>
<div class="flex-1">
<h3 class="font-h2 text-[18px] text-on-surface leading-tight mb-1">Bento Lunch at Park</h3>
<div class="flex items-center gap-xs font-label-caps text-label-caps text-primary">
<span class="material-symbols-outlined text-[14px]">schedule</span>
                                01:00 PM
                            </div>
</div>
<span class="material-symbols-outlined text-primary/50 cursor-grab">drag_indicator</span>
</div>
</div>
<!-- Card 4 -->
<div class="relative pl-xl flex items-center gap-gutter group">
<div class="absolute left-[21px] w-4 h-4 rounded-full bg-white border-2 border-secondary-container shadow-[0_0_12px_rgba(178,242,187,1)] z-20"></div>
<div class="flex-1 jelly-surface bg-white/40 rounded-xl p-gutter flex items-center gap-md rotate-[-0.5deg] hover:bg-white/50 transition-colors">
<div class="text-[32px] drop-shadow-md">📸</div>
<div class="flex-1">
<h3 class="font-h2 text-[18px] text-on-surface leading-tight mb-1">Kiyomizu-dera Walk</h3>
<div class="flex items-center gap-xs font-label-caps text-label-caps text-tertiary">
<span class="material-symbols-outlined text-[14px]">schedule</span>
                                03:30 PM
                            </div>
</div>
<span class="material-symbols-outlined text-outline-variant opacity-40 cursor-grab">drag_indicator</span>
</div>
</div>
<!-- Add New Item Button -->
<div class="relative pl-xl flex items-center gap-gutter mt-sm">
<div class="absolute left-[23px] w-3 h-3 rounded-full bg-white/50 z-20"></div>
<button class="flex-1 jelly-surface bg-white/20 rounded-xl p-md border-dashed border-2 border-white/40 flex items-center justify-center gap-xs text-on-surface-variant font-h2 text-label-caps hover:bg-white/30 transition-colors">
<span class="material-symbols-outlined text-[18px]">add_circle</span>
                        Add Jelly Plan
                    </button>
</div>
</div>
</div>
</main>
<!-- BottomNavBar (Shared Component) -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-8 pointer-events-none">
<div class="w-full max-w-md mx-auto bg-white/40 dark:bg-slate-900/30 backdrop-blur-3xl rounded-[40px] border border-white/60 shadow-2xl backdrop-blur-[30px] border-t border-l flex justify-around items-center p-2 pointer-events-auto">
<!-- Inactive -->
<button class="flex flex-col items-center justify-center text-pink-500 opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl" data-icon="home">home</span>
</button>
<!-- Active (Itinerary Planner maps to calendar_month) -->
<button class="flex flex-col items-center justify-center text-pink-500 bg-white/60 shadow-[0_0_20px_rgba(255,183,206,0.6)] rounded-full p-3 scale-110 active:scale-90 active:blur-[2px] transition-all">
<span class="material-symbols-outlined text-2xl" data-icon="calendar_month" data-weight="fill" style="font-variation-settings: 'FILL' 1;">calendar_month</span>
</button>
<!-- Inactive -->
<button class="flex flex-col items-center justify-center text-pink-500 opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl" data-icon="map">map</span>
</button>
<!-- Inactive -->
<button class="flex flex-col items-center justify-center text-pink-500 opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl" data-icon="backpack">backpack</span>
</button>
<!-- Inactive -->
<button class="flex flex-col items-center justify-center text-pink-500 opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px]">
<span class="material-symbols-outlined text-2xl" data-icon="account_balance_wallet">account_balance_wallet</span>
</button>
</div>
</nav>
</body></html>

<!-- Preparation Hub -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<title>RoamJelly - Preparation Hub</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;900&amp;family=Be+Vietnam+Pro:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<style>
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        /* Hide scrollbar for clean jelly look */
        ::-webkit-scrollbar {
            display: none;
        }
        body {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
    </style>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-primary-fixed": "#360b1e",
                        "tertiary-fixed-dim": "#9accf3",
                        "error": "#ba1a1a",
                        "on-tertiary-fixed-variant": "#0c4b6c",
                        "tertiary": "#2e6385",
                        "tertiary-fixed": "#c9e6ff",
                        "primary-fixed-dim": "#fab3ca",
                        "on-surface": "#1a1c1c",
                        "surface-container-low": "#f3f3f4",
                        "inverse-surface": "#2f3131",
                        "surface-bright": "#f9f9f9",
                        "secondary-fixed": "#b2f2bb",
                        "secondary-fixed-dim": "#96d5a0",
                        "secondary-container": "#b2f2bb",
                        "on-secondary-fixed-variant": "#145129",
                        "inverse-on-surface": "#f0f1f1",
                        "surface-tint": "#864d61",
                        "surface-dim": "#dadada",
                        "surface-variant": "#e2e2e2",
                        "inverse-primary": "#fab3ca",
                        "background": "#f9f9f9",
                        "on-primary-fixed-variant": "#6a364a",
                        "tertiary-container": "#9ed1f8",
                        "surface": "#f9f9f9",
                        "primary": "#864d61",
                        "surface-container": "#eeeeee",
                        "on-background": "#1a1c1c",
                        "on-secondary": "#ffffff",
                        "on-primary-container": "#7b4458",
                        "on-primary": "#ffffff",
                        "on-surface-variant": "#514347",
                        "outline-variant": "#d5c2c6",
                        "on-error-container": "#93000a",
                        "surface-container-highest": "#e2e2e2",
                        "on-tertiary": "#ffffff",
                        "error-container": "#ffdad6",
                        "primary-fixed": "#ffd9e3",
                        "on-error": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "on-tertiary-fixed": "#001e2f",
                        "on-secondary-fixed": "#00210b",
                        "primary-container": "#ffb7ce",
                        "secondary": "#2f6a3f",
                        "on-tertiary-container": "#235a7c",
                        "on-secondary-container": "#357044",
                        "surface-container-high": "#e8e8e8",
                        "outline": "#837377"
                    },
                    "borderRadius": {
                        "DEFAULT": "1rem",
                        "lg": "2rem",
                        "xl": "3rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "16px",
                        "md": "20px",
                        "xl": "48px",
                        "container-padding": "24px",
                        "lg": "32px",
                        "sm": "12px",
                        "base": "8px",
                        "xs": "4px"
                    },
                    "fontFamily": {
                        "h2": ["Plus Jakarta Sans"],
                        "h1": ["Plus Jakarta Sans"],
                        "body-lg": ["Be Vietnam Pro"],
                        "body-md": ["Be Vietnam Pro"],
                        "label-caps": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "h2": ["24px", { "lineHeight": "1.3", "fontWeight": "600" }],
                        "h1": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700" }],
                        "body-lg": ["18px", { "lineHeight": "1.6", "fontWeight": "400" }],
                        "body-md": ["16px", { "lineHeight": "1.5", "fontWeight": "400" }],
                        "label-caps": ["12px", { "lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "700" }]
                    }
                }
            }
        }
    </script>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-background text-on-background min-h-screen relative overflow-x-hidden font-body-md text-body-md pb-[120px]">
<!-- Decorative Background Gradients for Jelly vibe -->
<div class="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
<div class="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary-container/40 blur-[80px]"></div>
<div class="absolute bottom-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-tertiary-fixed/40 blur-[100px]"></div>
<div class="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-secondary-container/30 blur-[70px]"></div>
</div>
<!-- TopAppBar -->
<header class="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/30 dark:bg-pink-900/20 backdrop-blur-2xl rounded-b-[40px] border-b border-l border-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] backdrop-blur-[25px]">
<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white/80 shadow-md">
<img alt="User Profile" class="w-full h-full object-cover" data-alt="close up portrait of a young woman with a soft smile, natural lighting, warm pastel tones" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4SXs4zai1mdt5B25VuZG3M7vzf_3DyU52WSx0_shmFHubY9m4dYl_8EIHbdOUvx893-hvIqFYVWWz3AzZOBZyPFtpjf1cyyI4lUmeW_t9evYrvusW-AjS3KqboLg5mdvS_kbL2v-Jsb9Ac_-kSy15_k3hvkz67Jif-GJx2dyClawPT7LDIH_HJ-YV2CMSqF_tgHWcvwRxk04g_8g7qiBZfq8CaC0dT_nKhucc50lcgf1KnR1_e9e82Noc21kxpi9KB_-JKuCY2L9g"/>
</div>
<div class="text-2xl font-black text-pink-500 italic text-center text-pink-400 dark:text-pink-200 font-plus-jakarta text-lg font-bold tracking-tight">RoamJelly</div>
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.8)] hover:scale-105 transition-transform active:scale-95 duration-300 active:blur-sm text-pink-400">
<span class="material-symbols-outlined" data-weight="fill" style="font-variation-settings: 'FILL' 1;">notifications</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="pt-[100px] px-container-padding max-w-md mx-auto space-y-lg">
<!-- Header -->
<div class="space-y-xs pt-sm">
<h1 class="font-h1 text-h1 text-primary">Prep Hub</h1>
<p class="font-body-lg text-body-lg text-on-surface-variant">Kyoto is calling! Let's get you ready. 🌸</p>
</div>
<!-- Weather Card (Glassmorphic) -->
<section class="relative rounded-xl p-md bg-white/40 backdrop-blur-[25px] border-t-2 border-l-2 border-white/70 shadow-[inset_0_2px_15px_rgba(255,255,255,0.9),0_10px_30px_rgba(134,77,97,0.1)] overflow-hidden hover:scale-[1.02] transition-transform duration-300">
<!-- Weather decorative background image -->
<div class="absolute inset-0 z-0 opacity-20 bg-cover bg-center mix-blend-overlay" data-alt="soft blurred background of a sunny spring day with cherry blossoms" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAaMVziRT6-Y9U5mkXCVUZw2KpRQsTCfpvSynKbpKexuyI4jzIw3aMfRGGGGiVaOsnwy5b7nkS2s-VM2_0W8xSkoTxTx7zSzWI5ryIU3lLPbwGytSoE0VQl2LHSEWGikEAPmaYlqTAJkh11t9yChHX-HkZp6yr8nq-G2_NRJh7LCHQXlssWvPwSAssJ6Rfov_StXR2yr6XW1DQSAWF4Hth2xa8i_Au49qc4bw-N7ICwmliU4EO8DZF58Qme2sAo9KRFA8Gz5LfgpgR_');"></div>
<div class="relative z-10 flex flex-col space-y-md">
<div class="flex justify-between items-start">
<div>
<h2 class="font-h2 text-h2 text-primary-fixed-dim drop-shadow-sm">Tomorrow</h2>
<p class="font-label-caps text-label-caps text-on-surface-variant opacity-80 mt-1">KYOTO, JAPAN</p>
</div>
<div class="text-5xl drop-shadow-md">☀️</div>
</div>
<div class="flex items-end justify-between">
<div class="text-[56px] font-bold leading-none text-primary drop-shadow-sm font-h1">
                        22°
                    </div>
<div class="text-right space-y-1">
<p class="font-label-caps text-label-caps text-secondary-fixed-dim bg-white/50 px-2 py-1 rounded-full inline-block backdrop-blur-md shadow-sm border border-white/40">Perfect for walking</p>
</div>
</div>
<!-- Outfit Suggestion -->
<div class="bg-white/60 rounded-lg p-sm backdrop-blur-md border border-white/50 shadow-[inset_0_1px_5px_rgba(255,255,255,0.8)] mt-2">
<div class="flex items-center space-x-3">
<div class="w-12 h-12 rounded-full bg-primary-container/50 flex items-center justify-center text-2xl shadow-inner">
                            👗
                        </div>
<div>
<p class="font-body-md text-body-md font-semibold text-primary">Light layers!</p>
<p class="font-label-caps text-label-caps text-on-surface-variant">Cardigan &amp; comfy sneakers.</p>
</div>
</div>
</div>
</div>
</section>
<!-- Packing List (Sticker-book interface) -->
<section class="space-y-md">
<div class="flex justify-between items-end">
<h2 class="font-h2 text-h2 text-primary">My Suitcase</h2>
<span class="font-label-caps text-label-caps text-on-surface-variant bg-tertiary-container/30 px-3 py-1 rounded-full">3/12 Packed</span>
</div>
<div class="grid grid-cols-2 gap-gutter">
<!-- Category: Essentials -->
<div class="col-span-2 bg-surface-container-low/50 rounded-xl p-md backdrop-blur-xl border border-white/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.6)]">
<h3 class="font-label-caps text-label-caps text-tertiary mb-3 flex items-center"><span class="material-symbols-outlined text-[16px] mr-1">flight_takeoff</span> ESSENTIALS</h3>
<div class="space-y-sm">
<label class="flex items-center space-x-3 group cursor-pointer">
<div class="relative w-6 h-6 flex items-center justify-center">
<input checked="" class="peer sr-only" type="checkbox"/>
<div class="w-6 h-6 rounded-full border-2 border-primary-container bg-white/50 peer-checked:bg-primary peer-checked:border-primary transition-all shadow-sm"></div>
<span class="material-symbols-outlined text-[14px] text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" style="font-variation-settings: 'wght' 700;">check</span>
</div>
<span class="font-body-md text-body-md text-on-surface line-through opacity-60 transition-all peer-checked:line-through peer-checked:opacity-60">Passport</span>
</label>
<label class="flex items-center space-x-3 group cursor-pointer">
<div class="relative w-6 h-6 flex items-center justify-center">
<input class="peer sr-only" type="checkbox"/>
<div class="w-6 h-6 rounded-full border-2 border-primary-container bg-white/50 peer-checked:bg-primary peer-checked:border-primary transition-all shadow-sm"></div>
<span class="material-symbols-outlined text-[14px] text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" style="font-variation-settings: 'wght' 700;">check</span>
</div>
<span class="font-body-md text-body-md text-on-surface transition-all peer-checked:line-through peer-checked:opacity-60">JR Pass</span>
</label>
</div>
</div>
<!-- Category: Tech (Bento Style) -->
<div class="bg-tertiary-fixed/30 rounded-xl p-md backdrop-blur-xl border-t border-l border-white/60 shadow-sm flex flex-col justify-between">
<div class="flex justify-between items-start mb-4">
<span class="text-2xl">📸</span>
<div class="w-5 h-5 rounded-full border-2 border-tertiary/30 bg-white/40"></div>
</div>
<div>
<h4 class="font-body-md text-body-md font-semibold text-tertiary">Film Camera</h4>
<p class="font-label-caps text-label-caps text-tertiary/70 mt-1">Don't forget extra film!</p>
</div>
</div>
<!-- Category: Beauty (Bento Style) -->
<div class="bg-primary-fixed/40 rounded-xl p-md backdrop-blur-xl border-t border-l border-white/60 shadow-[0_4px_15px_rgba(255,217,227,0.4)] flex flex-col justify-between transform hover:-translate-y-1 transition-transform">
<div class="flex justify-between items-start mb-4">
<span class="text-2xl">🧴</span>
<div class="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
<span class="material-symbols-outlined text-[12px] text-white" style="font-variation-settings: 'wght' 700;">check</span>
</div>
</div>
<div>
<h4 class="font-body-md text-body-md font-semibold text-primary opacity-60 line-through">Skincare Minis</h4>
</div>
</div>
</div>
<!-- Add Item Jelly Button -->
<button class="w-full mt-4 py-3 rounded-full bg-gradient-to-r from-primary-container to-tertiary-fixed-dim text-on-primary-container font-h2 text-[16px] border border-white/60 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8),0_4px_15px_rgba(255,183,206,0.3)] hover:scale-[0.98] active:scale-95 active:blur-[1px] transition-all flex items-center justify-center space-x-2">
<span class="material-symbols-outlined">add</span>
<span>Add Item</span>
</button>
</section>
</main>
<!-- BottomNavBar -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-8 bg-white/40 dark:bg-slate-900/30 backdrop-blur-3xl rounded-[40px] m-6 border border-white/60 shadow-2xl backdrop-blur-[30px] border-t border-l border-white/40 text-pink-500 font-plus-jakarta text-[10px] uppercase font-bold" style="width: calc(100% - 48px); margin-left: 24px;">
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-[24px]">home</span>
</a>
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-[24px]">calendar_month</span>
</a>
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-[24px]">map</span>
</a>
<!-- Active Tab: Backpack (Preparation) -->
<a class="bg-white/60 shadow-[0_0_20px_rgba(255,183,206,0.6)] rounded-full p-3 scale-110 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center text-pink-500 relative" href="#">
<span class="material-symbols-outlined text-[24px]" data-weight="fill" style="font-variation-settings: 'FILL' 1;">backpack</span>
</a>
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-[24px]">account_balance_wallet</span>
</a>
</nav>
</body></html>

<!-- Jelly Ledger -->
<!DOCTYPE html>

<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>RoamJelly - Jelly Ledger</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&amp;family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,500&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
          darkMode: "class",
          theme: {
            extend: {
              "colors": {
                      "on-primary-fixed": "#360b1e",
                      "tertiary-fixed-dim": "#9accf3",
                      "error": "#ba1a1a",
                      "on-tertiary-fixed-variant": "#0c4b6c",
                      "tertiary": "#2e6385",
                      "tertiary-fixed": "#c9e6ff",
                      "primary-fixed-dim": "#fab3ca",
                      "on-surface": "#1a1c1c",
                      "surface-container-low": "#f3f3f4",
                      "inverse-surface": "#2f3131",
                      "surface-bright": "#f9f9f9",
                      "secondary-fixed": "#b2f2bb",
                      "secondary-fixed-dim": "#96d5a0",
                      "secondary-container": "#b2f2bb",
                      "on-secondary-fixed-variant": "#145129",
                      "inverse-on-surface": "#f0f1f1",
                      "surface-tint": "#864d61",
                      "surface-dim": "#dadada",
                      "surface-variant": "#e2e2e2",
                      "inverse-primary": "#fab3ca",
                      "background": "#f9f9f9",
                      "on-primary-fixed-variant": "#6a364a",
                      "tertiary-container": "#9ed1f8",
                      "surface": "#f9f9f9",
                      "primary": "#864d61",
                      "surface-container": "#eeeeee",
                      "on-background": "#1a1c1c",
                      "on-secondary": "#ffffff",
                      "on-primary-container": "#7b4458",
                      "on-primary": "#ffffff",
                      "on-surface-variant": "#514347",
                      "outline-variant": "#d5c2c6",
                      "on-error-container": "#93000a",
                      "surface-container-highest": "#e2e2e2",
                      "on-tertiary": "#ffffff",
                      "error-container": "#ffdad6",
                      "primary-fixed": "#ffd9e3",
                      "on-error": "#ffffff",
                      "surface-container-lowest": "#ffffff",
                      "on-tertiary-fixed": "#001e2f",
                      "on-secondary-fixed": "#00210b",
                      "primary-container": "#ffb7ce",
                      "secondary": "#2f6a3f",
                      "on-tertiary-container": "#235a7c",
                      "on-secondary-container": "#357044",
                      "surface-container-high": "#e8e8e8",
                      "outline": "#837377"
              },
              "borderRadius": {
                      "DEFAULT": "1rem",
                      "lg": "2rem",
                      "xl": "3rem",
                      "full": "9999px"
              },
              "spacing": {
                      "gutter": "16px",
                      "md": "20px",
                      "xl": "48px",
                      "container-padding": "24px",
                      "lg": "32px",
                      "sm": "12px",
                      "base": "8px",
                      "xs": "4px"
              },
              "fontFamily": {
                      "h2": [
                              "Plus Jakarta Sans"
                      ],
                      "h1": [
                              "Plus Jakarta Sans"
                      ],
                      "body-lg": [
                              "Be Vietnam Pro"
                      ],
                      "body-md": [
                              "Be Vietnam Pro"
                      ],
                      "label-caps": [
                              "Plus Jakarta Sans"
                      ]
              },
              "fontSize": {
                      "h2": [
                              "24px",
                              {
                                      "lineHeight": "1.3",
                                      "fontWeight": "600"
                              }
                      ],
                      "h1": [
                              "32px",
                              {
                                      "lineHeight": "1.2",
                                      "letterSpacing": "-0.02em",
                                      "fontWeight": "700"
                              }
                      ],
                      "body-lg": [
                              "18px",
                              {
                                      "lineHeight": "1.6",
                                      "fontWeight": "400"
                              }
                      ],
                      "body-md": [
                              "16px",
                              {
                                      "lineHeight": "1.5",
                                      "fontWeight": "400"
                              }
                      ],
                      "label-caps": [
                              "12px",
                              {
                                      "lineHeight": "1",
                                      "letterSpacing": "0.05em",
                                      "fontWeight": "700"
                              }
                      ]
              }
      },
          },
        }
    </script>
<style>
        /* Extreme Glassmorphism / Jelly setup */
        body {
            background-color: #fce4ec; /* Soft base for jelly effect */
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(255, 183, 206, 0.4) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(158, 209, 248, 0.4) 0%, transparent 40%),
                radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.8) 0%, transparent 60%);
            background-attachment: fixed;
            min-height: 100vh;
        }

        /* Material Icons setup */
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }

        .jelly-card {
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            background-color: rgba(255, 255, 255, 0.35);
            border: 1.5px solid rgba(255, 255, 255, 0.5);
            border-right-color: rgba(255, 255, 255, 0.2);
            border-bottom-color: rgba(255, 255, 255, 0.2);
            box-shadow: inset 0 2px 10px rgba(255, 255, 255, 0.8), 0 8px 32px rgba(134, 77, 97, 0.05);
        }

        .jelly-button {
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: inset 0 2px 5px rgba(255, 255, 255, 0.9), 0 4px 10px rgba(134, 77, 97, 0.1);
        }
        .jelly-button:active {
            transform: scale(0.95);
            filter: blur(1px);
        }
        
        /* Smooth chart animations */
        @keyframes dash {
            to { stroke-dashoffset: 0; }
        }
        .chart-segment {
            animation: dash 1.5s ease-out forwards;
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="text-on-surface font-body-md antialiased overflow-x-hidden">
<!-- TopAppBar -->
<header class="bg-white/30 dark:bg-pink-900/20 backdrop-blur-2xl rounded-b-[40px] border-b border-l border-white/50 shadow-[inset_0_2px_10px_rgba(255,255,255,0.8)] fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-all duration-300">
<div class="flex items-center gap-sm">
<!-- Leading Avatar -->
<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
<img alt="Avatar of user with soft natural lighting" class="w-full h-full object-cover" data-alt="close up portrait of a young woman with soft natural sunlight glowing on her face, gentle smile, pastel background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDqREN80fpMWCZSkhTZIggoeGL9Rhnfpogr-ZDHUhLdoKePb6TqEEodi7L9u6j6gM9P_JVxsqx_EoMQE4Fo3VTClOVMSNn1zr-_980czuUIAGARwbzIfYGoxqXgIM73iZJgEMed-QGvcpfS84OaDq8IIKTxuXHE1HKHsqhg1oDcwcJzVBlTdOWEQy7A30AeIKIma1D9GnHERsk3awkqpJvFrayn3xQEn5DdRnIXBRFiOG8PX6n3g8M49nTLCk38caxIuWZFQq7Raie2"/>
</div>
</div>
<!-- Headline -->
<h1 class="font-plus-jakarta text-lg font-bold tracking-tight text-pink-400">RoamJelly</h1>
<!-- Trailing Icon -->
<button class="w-10 h-10 flex items-center justify-center rounded-full bg-white/40 border border-white/60 shadow-[inset_0_2px_5px_rgba(255,255,255,0.8)] text-pink-400 hover:scale-105 transition-transform active:scale-95 active:blur-sm">
<span class="material-symbols-outlined" data-icon="notifications">notifications</span>
</button>
</header>
<!-- Main Content Canvas -->
<main class="pt-[100px] pb-[120px] px-container-padding max-w-lg mx-auto flex flex-col gap-lg">
<!-- Page Header -->
<section class="flex flex-col gap-xs mt-sm">
<p class="font-label-caps text-label-caps text-primary uppercase tracking-widest">Bali Girls Trip</p>
<h2 class="font-h1 text-h1 text-on-surface">Jelly Ledger</h2>
</section>
<!-- Semi-Transparent Glass Chart Section -->
<section class="jelly-card rounded-xl p-container-padding flex flex-col items-center relative overflow-hidden">
<!-- Decorative background blur blobs inside card -->
<div class="absolute -top-10 -left-10 w-32 h-32 bg-primary-container/40 rounded-full blur-[30px]"></div>
<div class="absolute -bottom-10 -right-10 w-40 h-40 bg-tertiary-container/40 rounded-full blur-[30px]"></div>
<h3 class="font-h2 text-h2 text-on-surface-variant z-10 mb-md">Group Spend</h3>
<!-- SVG Donut Chart (Transparent & Glassy) -->
<div class="relative w-56 h-56 z-10 flex items-center justify-center">
<svg class="w-full h-full drop-shadow-xl transform -rotate-90" viewbox="0 0 100 100">
<!-- Base Track -->
<circle cx="50" cy="50" fill="transparent" r="40" stroke="rgba(255, 255, 255, 0.4)" stroke-width="14"></circle>
<!-- Segment 1 (Primary - Accommodation) -->
<circle class="chart-segment drop-shadow-md" cx="50" cy="50" fill="transparent" r="40" stroke="#ffb7ce" stroke-dasharray="251.2" stroke-dashoffset="100" stroke-linecap="round" stroke-width="14"></circle>
<!-- Segment 2 (Tertiary - Food) -->
<circle class="chart-segment drop-shadow-md" cx="50" cy="50" fill="transparent" r="40" stroke="#9ed1f8" stroke-dasharray="251.2" stroke-dashoffset="200" stroke-linecap="round" stroke-width="14" transform="rotate(140 50 50)"></circle>
<!-- Segment 3 (Secondary - Activities) -->
<circle class="chart-segment drop-shadow-md" cx="50" cy="50" fill="transparent" r="40" stroke="#b2f2bb" stroke-dasharray="251.2" stroke-dashoffset="220" stroke-linecap="round" stroke-width="14" transform="rotate(260 50 50)"></circle>
</svg>
<!-- Center Text -->
<div class="absolute inset-0 flex flex-col items-center justify-center text-center">
<span class="font-label-caps text-label-caps text-outline">Total</span>
<span class="font-h1 text-h1 text-primary mt-xs">$1,420</span>
</div>
</div>
<!-- Chart Legend Bento -->
<div class="w-full grid grid-cols-3 gap-sm mt-lg z-10">
<div class="bg-white/40 rounded-lg p-sm border border-white/50 text-center shadow-sm">
<div class="w-3 h-3 rounded-full bg-primary-container mx-auto mb-xs"></div>
<p class="font-label-caps text-[10px] text-on-surface-variant">Stay</p>
</div>
<div class="bg-white/40 rounded-lg p-sm border border-white/50 text-center shadow-sm">
<div class="w-3 h-3 rounded-full bg-tertiary-container mx-auto mb-xs"></div>
<p class="font-label-caps text-[10px] text-on-surface-variant">Food</p>
</div>
<div class="bg-white/40 rounded-lg p-sm border border-white/50 text-center shadow-sm">
<div class="w-3 h-3 rounded-full bg-secondary-container mx-auto mb-xs"></div>
<p class="font-label-caps text-[10px] text-on-surface-variant">Fun</p>
</div>
</div>
</section>
<!-- Who Owes Who List -->
<section class="flex flex-col gap-md mt-sm">
<h3 class="font-h2 text-[20px] text-on-surface px-xs">Who owes who</h3>
<div class="flex flex-col gap-sm">
<!-- Owe Item 1 -->
<div class="jelly-card rounded-lg p-sm flex items-center justify-between">
<div class="flex items-center gap-md">
<div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 shadow-sm relative">
<img alt="Avatar of Sarah" class="w-full h-full object-cover" data-alt="headshot of a smiling young woman with brown hair outdoors in soft sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCpfK5lhPOtjVWd039j-bKMczKTbPHiFwX4ejAs2FoL01XBAPblVVbAYpuMyK7bK6GJqqd3e8YuealROOHsj-3W-Cf6wWBm0yPKRdJm1-ubLUeIOTuJ33A9KHWIoeh2K-3n5bat95Ku8D8VrPYBNRriPVJPZlHKfgHBAIe8jaFPLqB8h3maDMNxp3S1Z1RQzLiG-pygV-Uci-w6u-24A_2AMm-5Q8KZtUOUnRI_C-0WWvw8dTB0m6Fe830oFmDMlZdJIj5CNIflPZfP"/>
<!-- Indicator badge -->
<div class="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container border-2 border-white rounded-full"></div>
</div>
<div class="flex flex-col">
<p class="font-body-md font-semibold text-on-surface">Sarah</p>
<p class="font-body-md text-sm text-tertiary">Owes you $45.50</p>
</div>
</div>
<!-- Gentle Reminder Button -->
<button class="jelly-button bg-gradient-to-r from-primary-container to-tertiary-container border border-white rounded-full px-sm py-xs flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px] text-on-primary-container" data-icon="send" style="font-variation-settings: 'FILL' 1;">send</span>
<span class="font-label-caps text-[10px] text-on-primary-container">Nudge</span>
</button>
</div>
<!-- Owe Item 2 -->
<div class="jelly-card rounded-lg p-sm flex items-center justify-between">
<div class="flex items-center gap-md">
<div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white/80 shadow-sm relative">
<img alt="Avatar of Chloe" class="w-full h-full object-cover" data-alt="portrait of a confident gen-z woman looking at camera with soft studio lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqrA8AON1cwWgoO1A-tSHM1DzgmKEQAPSDXgBpwwVOXL7P966mj8G1MBhMmno3hKMiQTFHHaI1ZVAF_vRwkWWQ9DNwBrQSPQzeen8pRataaQ7QwO_cREiNSfbm15EJrGPJP6zAJUTM9Xioou-dY5f1w91MSUSe8QXNo8YxpMh7T3M4ler6tWg0LZZ2xi5Qa9RpDn6ffVcH8dg07s5_BuzolVo830cZAkrrvFqtTrV0tD_8IohoxfZ1dVY0p2sUYjvq7Ob2zFrVWtKu"/>
<div class="absolute bottom-0 right-0 w-3 h-3 bg-tertiary-container border-2 border-white rounded-full"></div>
</div>
<div class="flex flex-col">
<p class="font-body-md font-semibold text-on-surface">Chloe</p>
<p class="font-body-md text-sm text-tertiary">Owes you $12.00</p>
</div>
</div>
<!-- Gentle Reminder Button -->
<button class="jelly-button bg-gradient-to-r from-primary-container to-tertiary-container border border-white rounded-full px-sm py-xs flex items-center gap-xs">
<span class="material-symbols-outlined text-[16px] text-on-primary-container" data-icon="send" style="font-variation-settings: 'FILL' 1;">send</span>
<span class="font-label-caps text-[10px] text-on-primary-container">Nudge</span>
</button>
</div>
<!-- Settled Item -->
<div class="jelly-card rounded-lg p-sm flex items-center justify-between opacity-80 bg-white/20">
<div class="flex items-center gap-md">
<div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 shadow-sm grayscale-[30%]">
<img alt="Avatar of Mia" class="w-full h-full object-cover" data-alt="young asian woman smiling gently outdoors blurred background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBmr1agllmkYxcZhMdx71e3ZeHiONNV3t1yDJRxv6bUh1-y6SpCEnsLC2KKgLF2Tg3PFtuv2SYxmeSLsyXEhfCI-jhmwM05NBu3Hu86r5roPQvAt_9MJfzu2z9Q9C-wuXvp7J2FwYqlTznokF2U6TRIRtPUOFWwx96UcZq9QS3jlSjM5Km03SiCuwThbcdxNjJ_qlzBxRi-lr1A7_Th0YTUwR0F9cBcgH6bPabN-xMSHUFcjgGTyvr4bhswFVBvXKEQ1H8-QqIgp6X_"/>
</div>
<div class="flex flex-col">
<p class="font-body-md font-semibold text-on-surface-variant">Mia</p>
<p class="font-body-md text-sm text-secondary">Settled up</p>
</div>
</div>
<div class="w-8 h-8 rounded-full bg-secondary-container/50 border border-white flex items-center justify-center">
<span class="material-symbols-outlined text-[18px] text-on-secondary-container" data-icon="check">check</span>
</div>
</div>
</div>
</section>
</main>
<!-- BottomNavBar (Shared Component) -->
<nav class="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-8 md:hidden bg-white/40 dark:bg-slate-900/30 backdrop-blur-3xl rounded-[40px] m-6 border border-white/60 shadow-2xl backdrop-blur-[30px] border-t border-l border-white/40 w-[calc(100%-48px)]">
<!-- home -->
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-pink-500 text-[28px]" data-icon="home">home</span>
</a>
<!-- calendar_month -->
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-pink-500 text-[28px]" data-icon="calendar_month">calendar_month</span>
</a>
<!-- map -->
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-pink-500 text-[28px]" data-icon="map">map</span>
</a>
<!-- backpack -->
<a class="opacity-60 grayscale-[50%] p-3 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-pink-500 text-[28px]" data-icon="backpack">backpack</span>
</a>
<!-- account_balance_wallet (ACTIVE TAB) -->
<a class="bg-white/60 shadow-[0_0_20px_rgba(255,183,206,0.6)] rounded-full p-3 scale-110 hover:opacity-100 hover:scale-110 transition-all active:scale-90 active:blur-[2px] flex flex-col items-center" href="#">
<span class="material-symbols-outlined text-pink-500 text-[28px]" data-icon="account_balance_wallet" style="font-variation-settings: 'FILL' 1;">account_balance_wallet</span>
</a>
</nav>
</body></html>

<!-- Booking Modal -->
<!DOCTYPE html>

<html class="light" lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" name="viewport"/>
<title>RoamJelly - Soft Redirect</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;900&amp;family=Be+Vietnam+Pro:wght@400;500;600&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-primary-fixed": "#360b1e",
                        "tertiary-fixed-dim": "#9accf3",
                        "error": "#ba1a1a",
                        "on-tertiary-fixed-variant": "#0c4b6c",
                        "tertiary": "#2e6385",
                        "tertiary-fixed": "#c9e6ff",
                        "primary-fixed-dim": "#fab3ca",
                        "on-surface": "#1a1c1c",
                        "surface-container-low": "#f3f3f4",
                        "inverse-surface": "#2f3131",
                        "surface-bright": "#f9f9f9",
                        "secondary-fixed": "#b2f2bb",
                        "secondary-fixed-dim": "#96d5a0",
                        "secondary-container": "#b2f2bb",
                        "on-secondary-fixed-variant": "#145129",
                        "inverse-on-surface": "#f0f1f1",
                        "surface-tint": "#864d61",
                        "surface-dim": "#dadada",
                        "surface-variant": "#e2e2e2",
                        "inverse-primary": "#fab3ca",
                        "background": "#f9f9f9",
                        "on-primary-fixed-variant": "#6a364a",
                        "tertiary-container": "#9ed1f8",
                        "surface": "#f9f9f9",
                        "primary": "#864d61",
                        "surface-container": "#eeeeee",
                        "on-background": "#1a1c1c",
                        "on-secondary": "#ffffff",
                        "on-primary-container": "#7b4458",
                        "on-primary": "#ffffff",
                        "on-surface-variant": "#514347",
                        "outline-variant": "#d5c2c6",
                        "on-error-container": "#93000a",
                        "surface-container-highest": "#e2e2e2",
                        "on-tertiary": "#ffffff",
                        "error-container": "#ffdad6",
                        "primary-fixed": "#ffd9e3",
                        "on-error": "#ffffff",
                        "surface-container-lowest": "#ffffff",
                        "on-tertiary-fixed": "#001e2f",
                        "on-secondary-fixed": "#00210b",
                        "primary-container": "#ffb7ce",
                        "secondary": "#2f6a3f",
                        "on-tertiary-container": "#235a7c",
                        "on-secondary-container": "#357044",
                        "surface-container-high": "#e8e8e8",
                        "outline": "#837377"
                    },
                    "borderRadius": {
                        "DEFAULT": "1rem",
                        "lg": "2rem",
                        "xl": "3rem",
                        "full": "9999px"
                    },
                    "spacing": {
                        "gutter": "16px",
                        "md": "20px",
                        "xl": "48px",
                        "container-padding": "24px",
                        "lg": "32px",
                        "sm": "12px",
                        "base": "8px",
                        "xs": "4px"
                    },
                    "fontFamily": {
                        "h2": ["Plus Jakarta Sans"],
                        "h1": ["Plus Jakarta Sans"],
                        "body-lg": ["Be Vietnam Pro"],
                        "body-md": ["Be Vietnam Pro"],
                        "label-caps": ["Plus Jakarta Sans"]
                    },
                    "fontSize": {
                        "h2": ["24px", {"lineHeight": "1.3", "fontWeight": "600"}],
                        "h1": ["32px", {"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "700"}],
                        "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400"}],
                        "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400"}],
                        "label-caps": ["12px", {"lineHeight": "1", "letterSpacing": "0.05em", "fontWeight": "700"}]
                    }
                }
            }
        }
    </script>
<style>
        .glass-overlay {
            background: rgba(249, 249, 249, 0.4);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }
        
        .jelly-drawer {
            background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(250,179,202,0.3) 100%);
            backdrop-filter: blur(35px);
            -webkit-backdrop-filter: blur(35px);
            box-shadow: 0 -10px 40px rgba(134, 77, 97, 0.1), inset 0 2px 10px rgba(255, 255, 255, 0.9);
            border-top: 1.5px solid rgba(255, 255, 255, 0.8);
            border-left: 1.5px solid rgba(255, 255, 255, 0.5);
            border-right: 1.5px solid rgba(255, 255, 255, 0.3);
        }

        .jelly-button-primary {
            background: linear-gradient(135deg, #fab3ca 0%, #ffb7ce 100%);
            box-shadow: 0 8px 20px rgba(250, 179, 202, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.9);
        }

        .jelly-button-secondary {
            background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(243,243,244,0.4) 100%);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), inset 0 2px 5px rgba(255, 255, 255, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.7);
        }
    </style>
<style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head>
<body class="bg-surface text-on-surface min-h-screen overflow-hidden antialiased">
<!-- Background context (blurred out travel destination) -->
<div class="fixed inset-0 z-0 bg-cover bg-center" data-alt="soft blurred dreamlike view of paris eiffel tower at sunset with pink and orange sky pastel tones" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCnca7CPs2sr4YXf43pY-eUiKqt8xuF2XylTTS8lWslEqBU58lEcLCo2LQonIeI4ap_zDS2zd77b74IqbwcChbcv21QGafUDY5lwf5TdMr6Hj6W90fO0mqL_y1qFD4N-i2Njcbk87xVM2naemeZeLIxL7d2Xo4kZwvSygCPyxmsXaK-Vce2O6XFYvOa9XkT6h-gX6bfW8a6MoPO3DlfyBqXDS0mF78Yh9jQc6zQNTOj_gZ9FZhQfbbcf7nE_gLWdv9es_QmZ0S10HlA');">
</div>
<!-- Darkening/Blurring Overlay for Modal Focus -->
<div class="fixed inset-0 z-10 glass-overlay"></div>
<!-- Modal Container -->
<div class="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
<!-- Bottom Sheet Drawer -->
<div class="jelly-drawer rounded-t-[48px] w-full max-w-2xl mx-auto pointer-events-auto pb-12 pt-6 px-container-padding transition-transform duration-500 transform translate-y-0 relative overflow-hidden">
<!-- Handle -->
<div class="w-16 h-1.5 bg-outline-variant/40 rounded-full mx-auto mb-8"></div>
<!-- Content Area -->
<div class="flex flex-col items-center text-center space-y-6">
<!-- Bouncing 3D Emoji Container -->
<div class="relative w-32 h-32 flex items-center justify-center bg-white/40 rounded-full shadow-[inset_0_2px_15px_rgba(255,255,255,1)] border border-white/60 mb-2">
<span class="text-7xl drop-shadow-xl filter pb-2">🛫</span>
</div>
<!-- Text Content -->
<div class="space-y-3 max-w-sm px-4">
<h2 class="font-h1 text-h1 text-primary">Ready for takeoff!</h2>
<p class="font-body-lg text-body-lg text-on-surface-variant">
                        Opening <span class="font-bold text-primary">EVA Air</span> for safe booking...
                    </p>
</div>
<!-- Action Buttons -->
<div class="w-full flex flex-col gap-4 mt-6">
<button class="jelly-button-primary w-full py-4 rounded-[24px] font-h2 text-[18px] text-on-primary-container active:scale-95 transition-all duration-300 backdrop-blur-md">
                        Confirm
                    </button>
<button class="jelly-button-secondary w-full py-4 rounded-[24px] font-h2 text-[18px] text-primary active:scale-95 transition-all duration-300 backdrop-blur-md flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 0;">favorite</span>
                        Favorite later
                    </button>
</div>
</div>
<!-- Decorative Jelly Blobs behind content -->
<div class="absolute -top-10 -right-10 w-40 h-40 bg-primary-container/20 rounded-full blur-2xl pointer-events-none"></div>
<div class="absolute -bottom-10 -left-10 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none"></div>
</div>
</div>
</body></html>