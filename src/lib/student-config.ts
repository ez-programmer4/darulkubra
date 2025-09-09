import { prisma } from "@/lib/prisma";

export async function getStudentStatuses() {
  try {
    const statuses = await prisma.studentStatus.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    const dynamicStatuses = statuses.map(s => s.name);
    
    // Add default statuses if none exist
    if (dynamicStatuses.length === 0) {
      return ["active", "Active", "Not yet", "inactive"];
    }
    
    return dynamicStatuses;
  } catch (error) {
    return ["active", "Active", "Not yet", "inactive"];
  }
}

export async function getStudentPackages() {
  try {
    const packages = await prisma.studentPackage.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    const dynamicPackages = packages.map(s => s.name);
    
    // Add default packages if none exist
    if (dynamicPackages.length === 0) {
      return ["Basic", "Premium", "Advanced", "VIP"];
    }
    
    return dynamicPackages;
  } catch (error) {
    return ["Basic", "Premium", "Advanced", "VIP"];
  }
}

export async function getStudentSubjects() {
  try {
    const subjects = await prisma.studentSubject.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    const dynamicSubjects = subjects.map(s => s.name);
    
    // Add default subjects if none exist
    if (dynamicSubjects.length === 0) {
      return ["Quran", "Arabic", "Islamic Studies", "Tajweed"];
    }
    
    return dynamicSubjects;
  } catch (error) {
    return ["Quran", "Arabic", "Islamic Studies", "Tajweed"];
  }
}

export async function getAllStudentConfigurations() {
  try {
    const [statuses, packages, subjects] = await Promise.all([
      getStudentStatuses(),
      getStudentPackages(),
      getStudentSubjects()
    ]);
    
    return { statuses, packages, subjects };
  } catch (error) {
    return {
      statuses: ["active", "Active", "Not yet", "inactive"],
      packages: ["Basic", "Premium", "Advanced", "VIP"],
      subjects: ["Quran", "Arabic", "Islamic Studies", "Tajweed"]
    };
  }
}