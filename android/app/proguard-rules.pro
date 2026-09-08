# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Don't Break the Chain -------------------------------------------------
# Keep line numbers in Play Console crash reports (the mapping file is uploaded
# with the bundle, so this costs nothing at runtime).
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Capacitor bridges JS <-> Java by class and method name via reflection. The
# capacitor-android AAR ships consumer rules for plugin classes; these cover the
# annotation metadata those rules match on.
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keep class com.getcapacitor.** { *; }
-keep class com.opirasolutions.dontbreakthechain.** { *; }

# @capacitor-community/admob plugin + Google Mobile Ads.
-keep class com.getcapacitor.community.admob.** { *; }
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.**
