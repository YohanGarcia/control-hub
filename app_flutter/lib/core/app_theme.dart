import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'design_tokens.dart';

class AppTheme {
  static TextTheme _buildTextTheme(TextTheme base) =>
      GoogleFonts.interTextTheme(base).copyWith(
        headlineMedium: GoogleFonts.inter(fontWeight: FontWeight.w800, letterSpacing: -0.3),
        titleLarge:     GoogleFonts.inter(fontWeight: FontWeight.w700, letterSpacing: -0.2),
        titleMedium:    GoogleFonts.inter(fontWeight: FontWeight.w700),
        bodyMedium:     GoogleFonts.inter(height: 1.45),
        bodySmall:      GoogleFonts.inter(color: AppColors.textMuted),
        labelSmall:     GoogleFonts.inter(fontWeight: FontWeight.w600, letterSpacing: 0.5),
      );

  static final ThemeData dark = ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme(
      brightness: Brightness.dark,
      primary: AppColors.accentBlue,
      onPrimary: Colors.white,
      secondary: AppColors.accentCyan,
      onSecondary: Color(0xFF050816),
      error: AppColors.accentRed,
      onError: Colors.white,
      surface: AppColors.surfaceBase,
      onSurface: AppColors.textPrimary,
    ),
    scaffoldBackgroundColor: AppColors.deepBg,
    textTheme: _buildTextTheme(ThemeData.dark().textTheme.apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    )),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      backgroundColor: Colors.transparent,
      foregroundColor: AppColors.textPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
    ),
    cardTheme: CardThemeData(
      color: AppColors.surfaceRaised,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.lg,
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
      elevation: 0,
      shadowColor: Colors.transparent,
      margin: const EdgeInsets.symmetric(vertical: 8),
    ),
    chipTheme: ChipThemeData(
      selectedColor: AppColors.accentBlue.withValues(alpha: 0.16),
      side: const BorderSide(color: AppColors.borderSubtle),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.sm),
      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      backgroundColor: AppColors.surfaceSoft,
      disabledColor: AppColors.surfaceRaised,
      secondarySelectedColor: AppColors.accentBlue.withValues(alpha: 0.22),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surfaceBase,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      hintStyle: GoogleFonts.inter(color: AppColors.textMuted, fontSize: 13),
      border: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.borderSubtle),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.accentBlue, width: 1.4),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.borderMedium, thickness: 1),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.surfaceRaised,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.lg,
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
      titleTextStyle: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.textPrimary,
      ),
      contentTextStyle: GoogleFonts.inter(
        fontSize: 14,
        color: AppColors.textSecondary,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.surfaceRaised,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: AppColors.surfaceRaised,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.md,
        side: const BorderSide(color: AppColors.borderSubtle),
      ),
      textStyle: GoogleFonts.inter(
        fontSize: 13.5,
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w600,
      ),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: AppColors.textSecondary,
      textColor: AppColors.textPrimary,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.sm),
      titleTextStyle: GoogleFonts.inter(
        fontSize: 14.5,
        color: AppColors.textPrimary,
        fontWeight: FontWeight.w600,
      ),
      subtitleTextStyle: GoogleFonts.inter(
        fontSize: 12.5,
        color: AppColors.textMuted,
      ),
    ),
    tooltipTheme: TooltipThemeData(
      decoration: BoxDecoration(
        color: AppColors.surfaceHover,
        borderRadius: BorderRadius.circular(7),
        border: Border.all(color: AppColors.borderMedium),
      ),
      textStyle: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary),
    ),
  );

  static final ThemeData light = ThemeData(
    useMaterial3: true,
    colorScheme: const ColorScheme(
      brightness: Brightness.light,
      primary: AppColors.accentBlue,
      onPrimary: Colors.white,
      secondary: AppColors.accentCyan,
      onSecondary: Colors.white,
      error: AppColors.accentRed,
      onError: Colors.white,
      surface: AppColors.lightSurface,
      onSurface: AppColors.lightTextPrimary,
    ),
    scaffoldBackgroundColor: AppColors.lightBg,
    textTheme: _buildTextTheme(ThemeData.light().textTheme.apply(
      bodyColor: AppColors.lightTextPrimary,
      displayColor: AppColors.lightTextPrimary,
    )),
    appBarTheme: AppBarTheme(
      centerTitle: false,
      backgroundColor: Colors.transparent,
      foregroundColor: AppColors.lightTextPrimary,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.lightTextPrimary),
    ),
    cardTheme: CardThemeData(
      color: AppColors.lightSurface,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.lg,
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      elevation: 0,
      shadowColor: Colors.transparent,
      margin: const EdgeInsets.symmetric(vertical: 8),
    ),
    chipTheme: ChipThemeData(
      selectedColor: AppColors.accentBlue.withValues(alpha: 0.14),
      side: const BorderSide(color: AppColors.lightBorder),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.sm),
      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600),
      backgroundColor: AppColors.lightSurface,
      disabledColor: AppColors.lightRaised,
      secondarySelectedColor: AppColors.accentBlue.withValues(alpha: 0.2),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.lightSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.lightBorder),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppRadii.md,
        borderSide: const BorderSide(color: AppColors.accentBlue, width: 1.4),
      ),
    ),
    dividerTheme: const DividerThemeData(color: AppColors.lightBorder, thickness: 1),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.lightSurface,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.lg,
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      titleTextStyle: GoogleFonts.inter(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.lightTextPrimary,
      ),
      contentTextStyle: GoogleFonts.inter(
        fontSize: 14,
        color: AppColors.lightTextSecondary,
      ),
    ),
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.lightSurface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: AppColors.lightSurface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.md,
        side: const BorderSide(color: AppColors.lightBorder),
      ),
      textStyle: GoogleFonts.inter(
        fontSize: 13.5,
        color: AppColors.lightTextPrimary,
        fontWeight: FontWeight.w600,
      ),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: AppColors.lightTextSecondary,
      textColor: AppColors.lightTextPrimary,
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.sm),
      titleTextStyle: GoogleFonts.inter(
        fontSize: 14.5,
        color: AppColors.lightTextPrimary,
        fontWeight: FontWeight.w600,
      ),
      subtitleTextStyle: GoogleFonts.inter(
        fontSize: 12.5,
        color: AppColors.lightTextSecondary,
      ),
    ),
  );
}
