import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Clonar el repositorio
try {
  console.log('Clonando el repositorio...');
  execSync('git clone https://github.com/catherineMena/cinemaProyect.git');
  console.log('Repositorio clonado exitosamente');
} catch (error) {
  console.error('Error al clonar el repositorio:', error.message);
  process.exit(1);
}

// Función para listar archivos recursivamente
function listFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      fileList = listFilesRecursively(filePath, fileList);
    } else if (stat.isFile()) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Analizar la estructura del proyecto
console.log('\n--- ESTRUCTURA DEL PROYECTO ---');
const projectFiles = listFilesRecursively('cinemaProyect');
projectFiles.forEach(file => console.log(file));

// Analizar package.json
console.log('\n--- DEPENDENCIAS ---');
try {
  const packageJson = JSON.parse(fs.readFileSync('cinemaProyect/package.json', 'utf8'));
  console.log('Dependencias:', JSON.stringify(packageJson.dependencies, null, 2));
  console.log('Scripts:', JSON.stringify(packageJson.scripts, null, 2));
} catch (error) {
  console.log('No se pudo leer package.json:', error.message);
}

// Analizar rutas y controladores
console.log('\n--- RUTAS Y CONTROLADORES ---');
try {
  const routesDir = 'cinemaProyect/routes';
  if (fs.existsSync(routesDir)) {
    const routeFiles = fs.readdirSync(routesDir);
    routeFiles.forEach(file => {
      console.log(`Ruta: ${file}`);
      const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
      // Extraer endpoints básicos
      const endpoints = content.match(/router\.(get|post|put|delete)\s*\(\s*['"]([^'"]+)['"]/g);
      if (endpoints) {
        endpoints.forEach(endpoint => console.log(`  - ${endpoint}`));
      }
    });
  }
} catch (error) {
  console.log('Error al analizar rutas:', error.message);
}

// Verificar si hay implementación de autenticación
console.log('\n--- VERIFICACIÓN DE AUTENTICACIÓN ---');
try {
  let authImplemented = false;
  projectFiles.forEach(file => {
    if (file.includes('auth') || file.includes('login') || file.includes('jwt')) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('jwt') || content.includes('token') || content.includes('auth')) {
        console.log(`Posible implementación de autenticación en: ${file}`);
        authImplemented = true;
      }
    }
  });
  
  if (!authImplemented) {
    console.log('No se encontró una implementación clara de autenticación con JWT');
  }
} catch (error) {
  console.log('Error al verificar autenticación:', error.message);
}

// Verificar modelos de datos
console.log('\n--- MODELOS DE DATOS ---');
try {
  const modelsDir = 'cinemaProyect/models';
  if (fs.existsSync(modelsDir)) {
    const modelFiles = fs.readdirSync(modelsDir);
    modelFiles.forEach(file => {
      console.log(`Modelo: ${file}`);
      const content = fs.readFileSync(path.join(modelsDir, file), 'utf8');
      // Extraer esquemas básicos
      const schemaProps = content.match(/\w+\s*:\s*\{[^}]+\}/g);
      if (schemaProps) {
        console.log(`  - Propiedades encontradas: ${schemaProps.length}`);
      }
    });
  }
} catch (error) {
  console.log('Error al verificar modelos:', error.message);
}

console.log('\n--- ANÁLISIS COMPLETADO ---');
