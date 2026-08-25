# ── Stage 1: Build React frontend ───────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Build .NET backend ─────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app/backend
COPY backend/*.csproj ./
RUN dotnet restore
COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish

# ── Stage 3: Runtime image ──────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copy published backend
COPY --from=backend-build /app/publish ./

# Copy React build into wwwroot (served as static files)
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Render sets PORT env var — ASP.NET Core reads ASPNETCORE_URLS
ENV ASPNETCORE_URLS=http://+:10000
# Disable config file watching (hits inotify limit on Render free tier)
ENV DOTNET_USE_POLLING_FILE_WATCHER=false
ENV ASPNETCORE_hostBuilder__reloadConfigOnChange=false
EXPOSE 10000

ENTRYPOINT ["dotnet", "HotelManagement.API.dll"]
