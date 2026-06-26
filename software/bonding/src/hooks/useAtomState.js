    setMolecules(prev => prev.filter(molecule =>


    if (!atom1 || !atom2) return false;

    const atom1Available = atom1.valence - atom1.bonds.length;
    const atom2Available = atom2.valence - atom2.bonds.length;

};
