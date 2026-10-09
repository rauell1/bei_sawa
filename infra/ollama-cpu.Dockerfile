FROM ollama/ollama@sha256:31650ae0d08bde9c8bbd845d27f2da31acddf6ff735523869d8e5ee7a9969b03 AS upstream
FROM ubuntu:24.04
COPY --from=upstream /bin/ollama /bin/ollama
COPY --from=upstream /usr/lib/ollama/*.so* /usr/lib/ollama/
COPY --from=upstream /usr/lib/ollama/llama-* /usr/lib/ollama/
COPY --from=upstream /usr/lib/ollama/*LICENSE* /usr/lib/ollama/
COPY --from=upstream /usr/lib/ollama/*NOTICE* /usr/lib/ollama/
COPY --from=upstream /usr/lib/x86_64-linux-gnu/libstdc++.so.6* /usr/lib/x86_64-linux-gnu/
ENV OLLAMA_HOST=0.0.0.0:11434 OLLAMA_NO_CLOUD=true LD_LIBRARY_PATH=/usr/lib/ollama
ENTRYPOINT ["/bin/ollama"]
CMD ["serve"]
