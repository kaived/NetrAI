package com.orbionixtech.netrai;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "NetrAIFile")
public class NetrAIFilePlugin extends Plugin {
    @PluginMethod
    public void savePdf(PluginCall call) {
        String fileName = sanitizeFileName(call.getString("fileName", "NetrAI_Report.pdf"));
        String mimeType = call.getString("mimeType", "application/pdf");
        String base64Data = call.getString("base64Data");

        if (base64Data == null || base64Data.trim().isEmpty()) {
            call.reject("PDF data is missing.");
            return;
        }

        try {
            byte[] bytes = Base64.decode(stripDataUrlPrefix(base64Data), Base64.DEFAULT);
            Uri uri = saveToDownloads(fileName, mimeType, bytes);

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("fileName", fileName);
            result.put("directory", Environment.DIRECTORY_DOWNLOADS);
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Could not save PDF to Downloads.", error);
        }
    }

    private Uri saveToDownloads(String fileName, String mimeType, byte[] bytes) throws IOException {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return saveToMediaStoreDownloads(fileName, mimeType, bytes);
        }

        return saveToAppDownloads(fileName, bytes);
    }

    private Uri saveToMediaStoreDownloads(String fileName, String mimeType, byte[] bytes) throws IOException {
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
        if (uri == null) {
            throw new IOException("Android Downloads provider did not return a file URI.");
        }

        try (OutputStream outputStream = resolver.openOutputStream(uri)) {
            if (outputStream == null) {
                throw new IOException("Could not open Downloads output stream.");
            }
            outputStream.write(bytes);
        } catch (IOException error) {
            resolver.delete(uri, null, null);
            throw error;
        }

        ContentValues completed = new ContentValues();
        completed.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(uri, completed, null, null);
        return uri;
    }

    private Uri saveToAppDownloads(String fileName, byte[] bytes) throws IOException {
        File downloadsDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (downloadsDir == null) {
            downloadsDir = getContext().getFilesDir();
        }
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw new IOException("Could not create app Downloads folder.");
        }

        File outputFile = uniqueFile(downloadsDir, fileName);
        try (FileOutputStream outputStream = new FileOutputStream(outputFile)) {
            outputStream.write(bytes);
        }
        return Uri.fromFile(outputFile);
    }

    private static File uniqueFile(File folder, String fileName) {
        File candidate = new File(folder, fileName);
        if (!candidate.exists()) {
            return candidate;
        }

        String baseName = fileName;
        String extension = "";
        int dotIndex = fileName.lastIndexOf('.');
        if (dotIndex > 0) {
            baseName = fileName.substring(0, dotIndex);
            extension = fileName.substring(dotIndex);
        }

        int suffix = 2;
        do {
            candidate = new File(folder, baseName + "_" + suffix + extension);
            suffix += 1;
        } while (candidate.exists());

        return candidate;
    }

    private static String stripDataUrlPrefix(String value) {
        int commaIndex = value.indexOf(',');
        return commaIndex >= 0 ? value.substring(commaIndex + 1) : value;
    }

    private static String sanitizeFileName(String value) {
        String cleaned = value == null ? "" : value.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "_").trim();
        if (cleaned.isEmpty()) {
            cleaned = "NetrAI_Report.pdf";
        }
        if (!cleaned.toLowerCase().endsWith(".pdf")) {
            cleaned = cleaned + ".pdf";
        }
        return cleaned;
    }
}
