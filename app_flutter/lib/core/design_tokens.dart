import 'package:flutter/material.dart';

class AppColors {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  static const Color deepBg       = Color(0xFF050816); // black-navy base
  static const Color surfaceBase  = Color(0xFF0B1120); // panel/sidebar bg
  static const Color surfaceRaised= Color(0xFF101827); // cards
  static const Color surfaceSoft  = Color(0xFF1B2940); // subtle fills / borders
  static const Color surfaceHover = Color(0xFF24324A); // hover / active cards

  // ── Borders ────────────────────────────────────────────────────────────────
  static const Color borderSubtle = Color(0xFF1B2940); // soft borders
  static const Color borderMedium = Color(0xFF2E3D59); // dividers / stronger lines

  // ── Text ───────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textMuted     = Color(0xFF64748B);

  // ── Accents ────────────────────────────────────────────────────────────────
  static const Color accentCyan   = Color(0xFF22D3EE); // glow cyan
  static const Color accentBlue   = Color(0xFF3B82F6); // primary blue
  static const Color accentBlueDeep = Color(0xFF2563EB); // deep blue (gradients)
  static const Color accentGreen  = Color(0xFF22C55E); // online / ok
  static const Color accentAmber  = Color(0xFFF59E0B); // warning
  static const Color accentRed    = Color(0xFFEF4444); // error / offline
  static const Color accentPurple = Color(0xFFA855F7); // disk / premium

  // ── Metric card palette ────────────────────────────────────────────────────
  static const Color metricCpu  = Color(0xFF60A5FA); // blue-400
  static const Color metricRam  = Color(0xFF4ADE80); // green-400
  static const Color metricDisk = Color(0xFFC084FC); // purple-400

  // ── Light theme ────────────────────────────────────────────────────────────
  static const Color lightBg            = Color(0xFFF3F6FC);
  static const Color lightSurface       = Color(0xFFFFFFFF);
  static const Color lightRaised        = Color(0xFFEAF1FF);
  static const Color lightBorder        = Color(0xFFC2D0E4);
  static const Color lightTextPrimary   = Color(0xFF0D1B33);
  static const Color lightTextSecondary = Color(0xFF2F466A);
}

class AppRadii {
  static const BorderRadius lg = BorderRadius.all(Radius.circular(20));
  static const BorderRadius md = BorderRadius.all(Radius.circular(14));
  static const BorderRadius sm = BorderRadius.all(Radius.circular(10));
}

class AppSpacing {
  static const double xs  = 6;
  static const double sm  = 10;
  static const double md  = 14;
  static const double lg  = 18;
  static const double xl  = 24;
  static const double xxl = 32;
}

class AppShadows {
  // Blue-tinted card shadows
  static const List<BoxShadow> cardDark = <BoxShadow>[
    BoxShadow(
      color: Color(0x4D010614),
      blurRadius: 28,
      offset: Offset(0, 12),
    ),
    BoxShadow(
      color: Color(0x261A3AFF),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> cardLight = <BoxShadow>[
    BoxShadow(
      color: Color(0x1F2A3C5C),
      blurRadius: 20,
      offset: Offset(0, 10),
    ),
  ];

  // Soft glow for online/accent elements
  static List<BoxShadow> glow(Color color, {double radius = 8}) => [
    BoxShadow(color: color.withValues(alpha: 0.45), blurRadius: radius, spreadRadius: 0),
  ];
}

class AppGradients {
  // Background aura
  static const LinearGradient topAura = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[
      Color(0x882563EB),
      Color(0x4422D3EE),
      Color(0x08050816),
    ],
  );

  // Primary action button gradient (135°: deep-blue → violet)
  static const LinearGradient buttonPrimary = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: <Color>[Color(0xFF2563EB), Color(0xFF7C3AED)],
  );

  // Chart area gradients
  static const LinearGradient chartCpu = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[Color(0xFF2563EB), Color(0xFF60A5FA)],
  );
  static const LinearGradient chartRam = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[Color(0xFF16A34A), Color(0xFF4ADE80)],
  );
  static const LinearGradient chartDisk = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: <Color>[Color(0xFF9333EA), Color(0xFFC084FC)],
  );
}
