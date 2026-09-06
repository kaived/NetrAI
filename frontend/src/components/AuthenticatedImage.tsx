import React, { useEffect, useState } from 'react';
import { fetchDisplayAssetUrl } from '../api';

type AuthenticatedImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  fallback?: React.ReactNode;
};

export const AuthenticatedImage: React.FC<AuthenticatedImageProps> = ({ src, fallback = null, alt, ...props }) => {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let revoke: (() => void) | undefined;

    setDisplayUrl(null);
    setFailed(false);

    if (!src) {
      return () => undefined;
    }

    fetchDisplayAssetUrl(src)
      .then((asset) => {
        if (isCancelled) {
          asset.revoke();
          return;
        }
        revoke = asset.revoke;
        setDisplayUrl(asset.url);
      })
      .catch(() => {
        if (!isCancelled) {
          setFailed(true);
        }
      });

    return () => {
      isCancelled = true;
      if (revoke) {
        revoke();
      }
    };
  }, [src]);

  if (!src || failed || !displayUrl) {
    return fallback;
  }

  return <img {...props} src={displayUrl} alt={alt} />;
};
