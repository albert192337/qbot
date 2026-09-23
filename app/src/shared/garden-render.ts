/** Species with a supported 3D appearance; used by both UI and sowing validation. */
export function supportsGarden3D(species: string | undefined): boolean {
    return species === 'strawberry' || species === 'pineapple';
}
